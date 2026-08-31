import { Controller, Post, Get, Body, Request, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';
import type { AuthenticatedRequest } from './authenticated-request';
import { AUTH_COOKIE, authCookieOptions } from './auth-cookie';

// Strict limit for credential/email endpoints (brute force + email bombing).
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * The JWT travels only in an httpOnly cookie so injected page scripts can
   * never read it; the response body carries just the user profile.
   */
  private setAuthCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE, token, authCookieOptions(this.configService));
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.register(dto);
    this.setAuthCookie(res, access_token);
    return { user };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, user } = await this.authService.login(dto);
    this.setAuthCookie(res, access_token);
    return { user };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    // clearCookie must repeat the attributes (minus maxAge) or browsers
    // treat it as a different cookie and keep the original.
    const options = authCookieOptions(this.configService);
    delete options.maxAge;
    res.clearCookie(AUTH_COOKIE, options);
    return { message: 'Logged out' };
  }

  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
}
