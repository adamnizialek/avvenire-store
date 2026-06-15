import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  InventoryItemDto,
  ProductImageDto,
  toProductImageDtos,
} from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  inventory?: InventoryItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductImageDto)
  @Transform(toProductImageDtos)
  images?: ProductImageDto[];

  @IsOptional()
  @IsString()
  stripePriceId?: string;
}
