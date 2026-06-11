import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  private async issueToken(user: User) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto.email, dto.password);
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueToken(user);
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async forgotPassword(email: string) {
    const token = await this.usersService.createResetToken(email);
    if (token) {
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:5173',
      );
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
      // Fire-and-forget: do not await the email send so the response time and
      // status are identical whether or not the account exists (no enumeration
      // oracle via latency or a 500 leaking from a failed send).
      void this.mailService
        .sendPasswordReset(email, resetUrl)
        .catch((err) =>
          this.logger.error(`Failed to send reset email to ${email}`, err),
        );
    }
    // Always return success to prevent email enumeration
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const success = await this.usersService.resetPassword(token, newPassword);
    if (!success) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    return { message: 'Password has been reset successfully.' };
  }
}
