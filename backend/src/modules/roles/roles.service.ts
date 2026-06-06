import { Injectable } from '@nestjs/common';
import { AppError } from '../../common/errors/app-error';
import { PrismaService } from '../../database/prisma.service';

const ROLE_SELECT = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  rolePermissions: {
    include: { permission: { select: { id: true, name: true, description: true } } },
  },
  _count: { select: { userRoles: true } },
} as const;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      select: ROLE_SELECT,
      orderBy: { name: 'asc' },
    });
    return roles.map(this.mapRole);
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, select: ROLE_SELECT });
    if (!role) throw AppError.notFound(`Role not found`, 'ROLE_NOT_FOUND');
    return this.mapRole(role);
  }

  async findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
  }

  private mapRole(role: any) {
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map((rp: any) => rp.permission.name),
      userCount: role._count?.userRoles ?? 0,
    };
  }
}
