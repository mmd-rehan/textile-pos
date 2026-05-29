import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: { email: string; name: string; roleId?: string }) {
    const result = await this.authService.register(body);
    return {
      data: result,
    };
  }

  @Post('login')
  async login(@Body() body: { email: string }) {
    const result = await this.authService.login(body.email);
    return {
      data: result,
    };
  }
}
