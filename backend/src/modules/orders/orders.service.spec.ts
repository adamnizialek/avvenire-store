import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { Order } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';

type AnyObj = Record<string, any>;

function makeManager(findOne: jest.Mock) {
  return {
    findOne,
    save: jest.fn(async (x: AnyObj) => x),
    create: jest.fn((_entity: unknown, obj: AnyObj) => obj),
  };
}

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepository: { update: jest.Mock };
  let dataSource: { transaction: jest.Mock };

  beforeEach(async () => {
    ordersRepository = { update: jest.fn(async () => ({ affected: 1 })) };
    dataSource = { transaction: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  describe('create', () => {
    it('computes the total in integer cents and decrements stock', async () => {
      const product = {
        id: 'p1',
        name: 'Tee',
        price: 19.99,
        inventory: [{ size: 'M', quantity: 5 }],
      };
      const manager = makeManager(jest.fn(async () => product));
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const order = await service.create('user-1', {
        items: [{ productId: 'p1', quantity: 3, size: 'M' }],
      });

      // 1999 cents * 3 = 5997 cents → 59.97 (no float drift)
      expect(order.totalAmount).toBe(59.97);
      expect(product.inventory[0].quantity).toBe(2);
      expect(order.status).toBe('pending');
    });

    it('rejects an item with no size when the product has sized inventory', async () => {
      const product = {
        id: 'p1',
        name: 'Tee',
        price: 10,
        inventory: [{ size: 'M', quantity: 5 }],
      };
      const manager = makeManager(jest.fn(async () => product));
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(
        service.create('user-1', {
          items: [{ productId: 'p1', quantity: 1 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when requested quantity exceeds stock', async () => {
      const product = {
        id: 'p1',
        name: 'Tee',
        price: 10,
        inventory: [{ size: 'M', quantity: 2 }],
      };
      const manager = makeManager(jest.fn(async () => product));
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await expect(
        service.create('user-1', {
          items: [{ productId: 'p1', quantity: 3, size: 'M' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accumulates the same product across two sizes without losing a decrement', async () => {
      const product = {
        id: 'p1',
        name: 'Tee',
        price: 10,
        inventory: [
          { size: 'M', quantity: 5 },
          { size: 'L', quantity: 5 },
        ],
      };
      // The lock re-reads the SAME (mutated) product instance within the tx.
      const manager = makeManager(jest.fn(async () => product));
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      const order = await service.create('user-1', {
        items: [
          { productId: 'p1', quantity: 1, size: 'M' },
          { productId: 'p1', quantity: 2, size: 'L' },
        ],
      });

      expect(product.inventory[0].quantity).toBe(4);
      expect(product.inventory[1].quantity).toBe(3);
      expect(order.totalAmount).toBe(30);
    });
  });

  describe('markPaid', () => {
    it('only completes a still-pending order (idempotent)', async () => {
      await service.markPaid('order-1');
      expect(ordersRepository.update).toHaveBeenCalledWith(
        { id: 'order-1', status: 'pending' },
        { status: 'completed' },
      );
    });
  });

  describe('cancelAndRestock', () => {
    it('restocks a pending order and marks it cancelled', async () => {
      const product = {
        id: 'p1',
        inventory: [{ size: 'M', quantity: 2 }],
      };
      const order = {
        id: 'order-1',
        status: 'pending',
        items: [{ productId: 'p1', quantity: 3, size: 'M' }],
      };
      const findOne = jest.fn(async (entity: unknown) =>
        entity === Order ? order : product,
      );
      const manager = makeManager(findOne);
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await service.cancelAndRestock('order-1');

      expect(product.inventory[0].quantity).toBe(5);
      expect(order.status).toBe('cancelled');
    });

    it('does nothing for an order that is not pending', async () => {
      const order = { id: 'order-1', status: 'completed', items: [] };
      const findOne = jest.fn(async () => order);
      const manager = makeManager(findOne);
      dataSource.transaction.mockImplementation((cb: any) => cb(manager));

      await service.cancelAndRestock('order-1');

      expect(order.status).toBe('completed');
      expect(manager.save).not.toHaveBeenCalled();
    });
  });
});
