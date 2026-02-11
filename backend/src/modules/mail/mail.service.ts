import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private fromEmail: string;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    this.fromEmail = this.config.get<string>(
      'MAIL_FROM',
      'AVVENIRE <onboarding@resend.dev>',
    );
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: 'Reset your password — AVVENIRE',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 300; letter-spacing: 0.1em; text-align: center; margin-bottom: 32px;">AVVENIRE</h1>
          <p style="color: #333; line-height: 1.6;">You requested a password reset. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="background: #0a0a0a; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-size: 14px;">Reset Password</a>
          </div>
          <p style="color: #666; font-size: 13px; line-height: 1.6;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  }
}
