import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';

const USER_SELECT = {
  id: true,
  username: true,
  email: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    include: { role: { select: { id: true, name: true, description: true } } },
  },
} as const;

function mapUser(u: any) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    status: u.status,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    roles: u.userRoles.map((ur: any) => ur.role),
  };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return users.map(mapUser);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw AppError.notFound(`User not found`, 'USER_NOT_FOUND');
    return mapUser(user);
  }

  async create(
    data: { username: string; email: string; password: string; roleIds?: string[] },
    actorId: string,
  ) {
    if (await this.prisma.user.findUnique({ where: { email: data.email } })) {
      throw AppError.conflict(`Email ${data.email} is already in use`, 'EMAIL_EXISTS');
    }
    if (await this.prisma.user.findUnique({ where: { username: data.username } })) {
      throw AppError.conflict(`Username ${data.username} is already in use`, 'USERNAME_EXISTS');
    }

    if (data.roleIds?.length) {
      const found = await this.prisma.role.count({ where: { id: { in: data.roleIds } } });
      if (found !== data.roleIds.length) throw AppError.badRequest('One or more roles not found', 'ROLE_NOT_FOUND');
    }

    const passwordHash = await argon2.hash(data.password);

    const user = await this.prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        passwordHash,
        status: 'ACTIVE',
        ...(data.roleIds?.length
          ? { userRoles: { create: data.roleIds.map((roleId) => ({ roleId })) } }
          : {}),
      },
      select: USER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_CREATED',
        tableName: 'users',
        recordId: user.id,
        newValues: JSON.stringify({ username: user.username, email: user.email, roleIds: data.roleIds ?? [] }),
      },
    });

    return mapUser(user);
  }

  async update(id: string, data: { email?: string; status?: UserStatus }, actorId: string) {
    const existing = await this.findOne(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_UPDATED',
        tableName: 'users',
        recordId: id,
        oldValues: JSON.stringify({ email: existing.email, status: existing.status }),
        newValues: JSON.stringify(data),
      },
    });

    return mapUser(updated);
  }

  async assignRoles(id: string, roleIds: string[], actorId: string) {
    await this.findOne(id);

    if (roleIds.length) {
      const found = await this.prisma.role.count({ where: { id: { in: roleIds } } });
      if (found !== roleIds.length) throw AppError.badRequest('One or more roles not found', 'ROLE_NOT_FOUND');
    }

    const oldRoles = await this.prisma.userRole.findMany({
      where: { userId: id },
      include: { role: { select: { name: true } } },
    });

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      ...(roleIds.length
        ? [this.prisma.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) })]
        : []),
    ]);

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_ROLES_CHANGED',
        tableName: 'user_roles',
        recordId: id,
        oldValues: JSON.stringify({ roles: oldRoles.map((ur) => ur.role.name) }),
        newValues: JSON.stringify({ roleIds }),
      },
    });

    return this.findOne(id);
  }

  async changePassword(id: string, newPassword: string, actorId: string) {
    await this.findOne(id);

    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_PASSWORD_CHANGED',
        tableName: 'users',
        recordId: id,
        newValues: JSON.stringify({ changedBy: actorId }),
      },
    });
  }

  async remove(id: string, actorId: string) {
    const user = await this.findOne(id);

    if (user.roles.some((r: any) => r.name === 'Admin')) {
      const adminCount = await this.prisma.userRole.count({
        where: { role: { name: 'Admin' } },
      });
      if (adminCount <= 1) {
        throw AppError.badRequest('Cannot delete the last admin user', 'LAST_ADMIN');
      }
    }

    await this.prisma.user.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'USER_DELETED',
        tableName: 'users',
        recordId: id,
        oldValues: JSON.stringify({ username: user.username, email: user.email }),
      },
    });

    return { deleted: true };
  }
}
