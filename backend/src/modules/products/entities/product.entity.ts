import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrderItem } from '../../orders/entities/order-item.entity';
import { decimalTransformer } from '../../../common/decimal.transformer';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('numeric', {
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  price: number;

  @Index()
  @Column({ default: 'clothing' })
  category: string;

  @Column('simple-json', { default: '[]' })
  inventory: { size: string; quantity: number }[];

  @Column('simple-json', { default: '[]' })
  images: string[];

  @Column({ nullable: true })
  stripePriceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];
}
