import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    private productsService: ProductsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<Order> {
    let totalAmount = 0;
    const itemsData: Partial<OrderItem>[] = [];

    for (const item of dto.items) {
      const product = await this.productsService.findById(item.productId);
      const itemTotal = Number(product.price) * item.quantity;
      totalAmount += itemTotal;

      itemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        size: item.size || null,
      });
    }

    const order = this.ordersRepository.create({
      userId,
      totalAmount,
      status: 'pending',
      items: itemsData as OrderItem[],
    });

    return this.ordersRepository.save(order);
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

  async updateStatus(id: string, status: string): Promise<Order> {
    const order = await this.findById(id);
    order.status = status;
    return this.ordersRepository.save(order);
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
}
