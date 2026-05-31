import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AppError } from '../../common/errors/app-error';
import { AuthenticatedUser } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    identifier: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ accessToken: string; user: AuthenticatedUser }> {
    this.logger.log(`Login attempt for identifier: ${identifier}`);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (user.status === 'INACTIVE' || user.status === 'SUSPENDED') {
      throw AppError.forbidden(
        `Account is ${user.status.toLowerCase()}. Contact an administrator.`,
        'ACCOUNT_DISABLED',
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw AppError.unauthorized('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    const sessionToken = randomUUID();
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '8h';
    const expiresAt = this.parseExpiry(expiresIn);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id, sid: sessionToken });

    const fullUser = await this.buildAuthUser(user.id);
    return { accessToken, user: fullUser };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { token: sessionToken } });
    this.logger.log('Session invalidated');
  }

  async getMe(userId: string): Promise<AuthenticatedUser> {
    return this.buildAuthUser(userId);
  }

  private async buildAuthUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User not found', 'USER_NOT_FOUND');
    }

    const roles = user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name }));
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.name),
        ),
      ),
    ];

    return { id: user.id, username: user.username, email: user.email, status: user.status, roles, permissions };
  }

  private parseExpiry(expiresIn: string): Date {
    const now = new Date();
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      now.setHours(now.getHours() + 8);
      return now;
    }
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': now.setSeconds(now.getSeconds() + value); break;
      case 'm': now.setMinutes(now.getMinutes() + value); break;
      case 'h': now.setHours(now.getHours() + value); break;
      case 'd': now.setDate(now.getDate() + value); break;
    }
    return now;
  }
}
