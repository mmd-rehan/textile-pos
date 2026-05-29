import { Injectable, Logger } from '@nestjs/common';
import { UsersService, User } from '../users/users.service';
import { AppError } from '../../common/errors/app-error';

export interface AuthResult {
  user: User;
  accessToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly usersService: UsersService) {}

  async register(data: { email: string; name: string; roleId?: string }): Promise<AuthResult> {
    this.logger.log(`Registering new user email: ${data.email}`);
    
    const user = await this.usersService.create(data);
    const accessToken = `mock-jwt-token-for-${user.id}`;

    return {
      user,
      accessToken,
    };
  }

  async login(email: string): Promise<AuthResult> {
    this.logger.log(`Logging in user email: ${email}`);

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or credentials', 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw AppError.forbidden('User account is currently disabled', 'USER_DISABLED');
    }

    const accessToken = `mock-jwt-token-for-${user.id}`;

    return {
      user,
      accessToken,
    };
  }
}
