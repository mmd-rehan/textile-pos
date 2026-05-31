import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../database/prisma.service';
import { AppError } from '../../../common/errors/app-error';

export interface JwtPayload {
  sub: string;
  sid: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  status: string;
  roles: Array<{ id: string; name: string }>;
  permissions: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') as string,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const session = await this.prisma.session.findUnique({
      where: { token: payload.sid },
      include: {
        user: {
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
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw AppError.unauthorized('Session expired or invalid', 'SESSION_INVALID');
    }

    const user = session.user;
    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('User account is not active', 'USER_INACTIVE');
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
}
