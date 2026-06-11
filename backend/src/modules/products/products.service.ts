import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async findAll(
    category?: string,
    limit?: number,
    offset?: number,
  ): Promise<Product[]> {
    const where = category ? { category } : {};
    const take = Math.min(
      Math.max(Number(limit) || DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const skip = Math.max(Number(offset) || 0, 0);
    return this.productsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create(dto);
    return this.productsRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);
    // Only assign provided values. class-validator's @IsOptional skips validation
    // for explicit null, so stripping null/undefined here prevents a client from
    // clobbering NOT NULL columns (which would surface as a 500).
    const updates: Partial<UpdateProductDto> = {};
    for (const key of Object.keys(dto) as (keyof UpdateProductDto)[]) {
      const value = dto[key];
      if (value !== undefined && value !== null) {
        (updates as Record<string, unknown>)[key] = value;
      }
    }
    Object.assign(product, updates);
    return this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findById(id);
    try {
      await this.productsRepository.remove(product);
    } catch (err) {
      // A product referenced by existing order_items cannot be deleted without
      // destroying order history — report a clear conflict instead of a 500.
      if (err instanceof QueryFailedError) {
        throw new ConflictException(
          'This product has order history and cannot be deleted.',
        );
      }
      throw err;
    }
  }
}
