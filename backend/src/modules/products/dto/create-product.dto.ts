import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  IsNotEmpty,
  ArrayMinSize,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryItemDto {
  @IsString()
  @IsNotEmpty()
  size: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  inventory: InventoryItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  stripePriceId?: string;
}
