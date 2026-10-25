import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, QueryFailedError, Raw } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash } from 'crypto';
import { User } from './entities/user.entity';
import type { GoogleIdentity } from '../auth/google-id-token.verifier';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof QueryFailedError &&
    (err.driverError as { code?: string } | undefined)?.code === '23505'
  );
}

/** A hash of random bytes nobody knows: the account can't be password-logged-in. */
function unusablePassword(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString('hex'), 10);
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * Returns the user including the password hash and tokenVersion (both
   * select:false by default). Use only for authentication — never return the
   * result directly to a client.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'role', 'tokenVersion', 'createdAt'],
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async setRole(email: string, role: string): Promise<{ success: boolean }> {
    await this.usersRepository.update({ email }, { role });
    return { success: true };
  }

  async create(email: string, password: string): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { email } });
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

  /**
   * The account for a verified Google identity: the one already linked to it,
   * else the one registered with the same email (linked now), else a new one.
   * `grantAdmin` (the email is in ADMIN_EMAILS) promotes it to admin.
   */
  async findOrCreateForGoogle(
    identity: GoogleIdentity,
    grantAdmin: boolean,
  ): Promise<User> {
    let user = await this.usersRepository.findOne({
      where: { googleId: identity.sub },
    });
    if (!user) {
      user = await this.findForGoogleLink(identity.email);
      if (user) {
        // Linking by email is only safe when Google owns the mailbox, and
        // never over another Google account's link.
        if (user.googleId || !identity.googleOwnsEmail) {
          throw new ConflictException(
            'An account with this email already exists. Sign in with your password.',
          );
        }
        // First Google sign-in into a password account. Registration never
        // verifies the email, so that password may belong to whoever
        // registered this address first (account pre-hijacking) — and
        // grantAdmin would hand them an admin login. Google has now proven
        // who owns the address: retire the old password and revoke its
        // sessions. The owner can set a new one via "Forgot password", which
        // matches emails exactly, hence the normalized casing.
        user.email = identity.email;
        user.googleId = identity.sub;
        user.password = await unusablePassword();
        user.resetToken = null;
        user.resetTokenExpiry = null;
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      } else {
        user = this.usersRepository.create({
          email: identity.email,
          password: await unusablePassword(),
          googleId: identity.sub,
        });
      }
    }
    if (grantAdmin && user.role !== 'admin') {
      user.role = 'admin';
    }
    try {
      return await this.usersRepository.save(user);
    } catch (err) {
      // Two first sign-ins at once (double click, two tabs): the other one
      // created the account a moment ago. Use it instead of a 500.
      if (!user.id && isUniqueViolation(err)) {
        const created = await this.usersRepository.findOne({
          where: { googleId: identity.sub },
        });
        if (created) return created;
      }
      throw err;
    }
  }

  /** The account to link: exact email first (as Google has it), else any casing. */
  private async findForGoogleLink(email: string): Promise<User | null> {
    const select: (keyof User)[] = [
      'id',
      'email',
      'role',
      'tokenVersion',
      'googleId',
      'createdAt',
    ];
    return (
      (await this.usersRepository.findOne({ where: { email }, select })) ??
      (await this.usersRepository.findOne({
        where: {
          email: Raw((column) => `LOWER(${column}) = :email`, { email }),
        },
        select,
      }))
    );
  }

  async createResetToken(email: string): Promise<string | null> {
    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) return null;

    const token = randomBytes(32).toString('hex');
    // Store only the hash; the raw token lives only in the emailed link.
    user.resetToken = hashToken(token);
    user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.usersRepository.save(user);
    return token;
  }

  /**
   * Returns the user including the password hash and tokenVersion, looked up
   * by id. Use only to verify the current password on sensitive self-service
   * actions (e.g. account deletion) — never return the result to a client.
   */
  async findByIdWithAuth(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      select: [
        'id',
        'email',
        'password',
        'role',
        'tokenVersion',
        'googleId',
        'deletedAt',
      ],
    });
  }

  /**
   * GDPR erasure: anonymizes the account in place instead of deleting the
   * row, so retained order rows (tax/accounting obligation) keep a valid
   * owner reference while every piece of personal data is destroyed. The
   * tokenVersion bump revokes all outstanding JWTs immediately, and the
   * unusable random password, tombstone email and dropped Google link make
   * the account permanently un-loginable — while freeing the original email address for
   * a future fresh registration.
   */
  async anonymize(id: string): Promise<void> {
    const user = await this.findByIdWithAuth(id);
    if (!user) return;

    user.email = `deleted-${id}@anonymized.invalid`;
    user.password = await unusablePassword();
    user.googleId = null;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.deletedAt = new Date();
    await this.usersRepository.save(user);
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.usersRepository.findOne({
      where: {
        resetToken: hashToken(token),
        resetTokenExpiry: MoreThan(new Date()),
      },
    });
    if (!user) return false;

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    // Invalidate every JWT issued before this reset.
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.usersRepository.save(user);
    return true;
  }
}
