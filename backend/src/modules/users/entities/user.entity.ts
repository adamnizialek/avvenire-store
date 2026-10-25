import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @Column({ default: 'user' })
  role: string;

  // Bumped whenever credentials change; embedded in the JWT so old tokens
  // (e.g. an attacker's stolen token) are rejected after a password reset.
  @Column({ type: 'int', default: 0 })
  tokenVersion: number;

  @Column({ type: 'varchar', nullable: true, select: false })
  resetToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  resetTokenExpiry: Date | null;

  // Google account id (the ID token's `sub`) once the user has signed in with
  // Google. Set on first Google sign-in; null for password-only accounts.
  @Column({ type: 'varchar', nullable: true, unique: true, select: false })
  googleId: string | null;

  // GDPR erasure marker. The row itself is kept (orders reference it and are
  // retained for tax purposes) but every personal field is anonymized when
  // this is set.
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
