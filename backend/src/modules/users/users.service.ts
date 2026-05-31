import { Injectable, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    this.logger.log('Fetching all users');
    return this.prisma.user.findMany({
      select: { id: true, username: true, email: true, status: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    this.logger.log(`Fetching user by ID: ${id}`);
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, email: true, status: true, createdAt: true, updatedAt: true },
    });
    if (!user) {
      throw AppError.notFound(`User with ID ${id} not found`, 'USER_NOT_FOUND');
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, username: true, email: true, status: true, createdAt: true, updatedAt: true },
    });
  }

  async create(data: { username: string; email: string; password: string; roleIds?: string[] }) {
    this.logger.log(`Creating user: ${data.email}`);

    const emailExists = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (emailExists) {
      throw AppError.conflict(`Email ${data.email} is already in use`, 'EMAIL_EXISTS');
    }

    const usernameExists = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (usernameExists) {
      throw AppError.conflict(`Username ${data.username} is already in use`, 'USERNAME_EXISTS');
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
      select: { id: true, username: true, email: true, status: true, createdAt: true, updatedAt: true },
    });

    return user;
  }

  async update(id: string, data: { email?: string; status?: UserStatus }) {
    this.logger.log(`Updating user: ${id}`);

    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, status: true, createdAt: true, updatedAt: true },
    });
  }

  async remove(id: string) {
    this.logger.log(`Deleting user: ${id}`);
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }
}
