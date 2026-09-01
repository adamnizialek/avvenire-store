import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { OrdersService } from '../orders/orders.service';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const req = {
  user: { userId: 'u1', email: 'a@b.c', role: 'user' },
} as AuthenticatedRequest;

describe('UsersController (GDPR self-service)', () => {
  let controller: UsersController;
  let usersService: {
    findById: jest.Mock;
    findByIdWithAuth: jest.Mock;
    anonymize: jest.Mock;
  };
  let ordersService: { findByUserId: jest.Mock };
  let res: { clearCookie: jest.Mock };

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
      findByIdWithAuth: jest.fn(),
      anonymize: jest.fn().mockResolvedValue(undefined),
    };
    ordersService = { findByUserId: jest.fn().mockResolvedValue([]) };
    res = { clearCookie: jest.fn() };
    controller = new UsersController(
      usersService as unknown as UsersService,
      ordersService as unknown as OrdersService,
      { get: jest.fn() } as unknown as ConfigService,
    );
  });

  describe('exportData', () => {
    it('returns the profile and order history in portable form', async () => {
      usersService.findById.mockResolvedValue({
        id: 'u1',
        email: 'a@b.c',
        role: 'user',
        createdAt: new Date('2026-01-01'),
        // Fields that must NOT leak into the export:
        tokenVersion: 7,
        deletedAt: null,
      });
      ordersService.findByUserId.mockResolvedValue([
        {
          id: 'order-1',
          status: 'completed',
          totalAmount: 129.99,
          createdAt: new Date('2026-02-01'),
          items: [
            {
              product: { name: 'Trench Coat', images: ['not-exported'] },
              quantity: 1,
              size: 'M',
              price: 129.99,
            },
            // A product deleted from the catalogue must not break the export.
            { product: null, quantity: 2, size: null, price: 10 },
          ],
        },
      ]);

      const result = await controller.exportData(req);

      expect(result.user).toEqual({
        id: 'u1',
        email: 'a@b.c',
        role: 'user',
        createdAt: new Date('2026-01-01'),
      });
      expect(result.orders).toEqual([
        {
          id: 'order-1',
          status: 'completed',
          totalAmount: 129.99,
          createdAt: new Date('2026-02-01'),
          items: [
            { product: 'Trench Coat', quantity: 1, size: 'M', price: 129.99 },
            { product: null, quantity: 2, size: null, price: 10 },
          ],
        },
      ]);
      // No internal or secret fields anywhere in the payload.
      expect(JSON.stringify(result)).not.toContain('tokenVersion');
    });
  });

  describe('deleteAccount', () => {
    async function existingUser() {
      return {
        id: 'u1',
        email: 'a@b.c',
        password: await bcrypt.hash('correct-password', 4),
        tokenVersion: 0,
      };
    }

    it('rejects a wrong password with 403 (not 401) and deletes nothing', async () => {
      usersService.findByIdWithAuth.mockResolvedValue(await existingUser());

      await expect(
        controller.deleteAccount(
          req,
          { password: 'wrong-password' },
          res as unknown as Response,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(usersService.anonymize).not.toHaveBeenCalled();
      expect(res.clearCookie).not.toHaveBeenCalled();
    });

    it('anonymizes the account and drops the auth cookie on a correct password', async () => {
      usersService.findByIdWithAuth.mockResolvedValue(await existingUser());

      const result = await controller.deleteAccount(
        req,
        { password: 'correct-password' },
        res as unknown as Response,
      );

      expect(usersService.anonymize).toHaveBeenCalledWith('u1');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'access_token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(result.message).toContain('deleted');
    });
  });
});
