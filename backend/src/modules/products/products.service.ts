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
import { normalizeImages } from './product-image';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  private withNormalizedImages(product: Product): Product {
    product.images = normalizeImages(product.images);
    return product;
  }

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
    const products = await this.productsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return products.map((product) => this.withNormalizedImages(product));
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.withNormalizedImages(product);
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create({
      ...dto,
      images: normalizeImages(dto.images),
    });
    const saved = await this.productsRepository.save(product);
    return this.withNormalizedImages(saved);
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
    product.images = normalizeImages(product.images);
    const saved = await this.productsRepository.save(product);
    return this.withNormalizedImages(saved);
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
