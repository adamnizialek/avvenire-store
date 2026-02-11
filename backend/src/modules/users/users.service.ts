import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async setRole(email: string, role: string): Promise<{ success: boolean }> {
    await this.usersRepository.update({ email }, { role });
    return { success: true };
  }

  async create(email: string, password: string): Promise<User> {
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  async createResetToken(email: string): Promise<string | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    const token = randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersRepository.save(user);
    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: { resetToken: token, resetTokenExpiry: MoreThan(new Date()) },
    });
    if (!user) return false;

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null as any;
    user.resetTokenExpiry = null as any;
    await this.usersRepository.save(user);
    return true;
  }
}
