import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    private dataSource: DataSource,
  ) {}

  private async lockProduct(
    manager: EntityManager,
    productId: string,
  ): Promise<Product> {
    const product = await manager.findOne(Product, {
      where: { id: productId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }
    return product;
  }

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must contain at least one item');
    }

    return this.dataSource.transaction(async (manager) => {
      let totalCents = 0;
      const itemsData: Partial<OrderItem>[] = [];

      for (const item of dto.items) {
        // Lock the row for the duration of the transaction. Re-reading the same
        // product later in the loop (e.g. same product in two sizes) sees the
        // already-applied decrements, and concurrent checkouts block here —
        // preventing oversell and lost updates.
        const product = await this.lockProduct(manager, item.productId);

        const inventory = product.inventory ?? [];
        if (inventory.length > 0) {
          if (!item.size) {
            throw new BadRequestException(
              `Size is required for ${product.name}`,
            );
          }
          const entry = inventory.find((inv) => inv.size === item.size);
          if (!entry) {
            throw new BadRequestException(
              `Size ${item.size} is not available for ${product.name}`,
            );
          }
          if (entry.quantity < item.quantity) {
            throw new BadRequestException(
              `Not enough stock for ${product.name} (${item.size}). Available: ${entry.quantity}`,
            );
          }
          entry.quantity -= item.quantity;
          product.inventory = inventory;
          await manager.save(product);
        }

        totalCents += Math.round(Number(product.price) * 100) * item.quantity;

        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          size: item.size || null,
        });
      }

      const order = manager.create(Order, {
        userId,
        totalAmount: totalCents / 100,
        status: 'pending',
        items: itemsData as OrderItem[],
      });

      return manager.save(order);
    });
  }

  /**
   * Marks a pending order paid. Idempotent: replays and orders that are no
   * longer pending (already completed/cancelled) are left untouched.
   */
  async markPaid(id: string): Promise<void> {
    await this.ordersRepository.update(
      { id, status: 'pending' },
      { status: 'completed' },
    );
  }

  /**
   * Cancels a still-pending order and returns its reserved stock. Idempotent
   * and safe to call from expired/failed-payment webhooks.
   */
  async cancelAndRestock(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, {
        where: { id },
        relations: ['items'],
      });
      if (!order || order.status !== 'pending') {
        return;
      }
      for (const item of order.items) {
        if (!item.size) continue;
        const product = await this.lockProduct(manager, item.productId);
        const inventory = product.inventory ?? [];
        const entry = inventory.find((inv) => inv.size === item.size);
        if (entry) {
          entry.quantity += item.quantity;
          product.inventory = inventory;
          await manager.save(product);
        }
      }
      order.status = 'cancelled';
      await manager.save(order);
    });
  }

  async findByUserId(userId: string): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { userId },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findByIdForUser(id: string, userId: string): Promise<Order> {
    const order = await this.findById(id);
    if (order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async setStripeSessionId(id: string, sessionId: string): Promise<Order> {
    const order = await this.findById(id);
    order.stripeSessionId = sessionId;
    return this.ordersRepository.save(order);
  }

  async findByStripeSessionId(sessionId: string): Promise<Order | null> {
    return this.ordersRepository.findOne({
      where: { stripeSessionId: sessionId },
      relations: ['items', 'items.product'],
    });
  }

  async findBySessionForUser(
    sessionId: string,
    userId: string,
  ): Promise<{ id: string; status: string }> {
    const order = await this.findByStripeSessionId(sessionId);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return { id: order.id, status: order.status };
  }
}
