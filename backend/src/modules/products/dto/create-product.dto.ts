import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  IsNotEmpty,
  ArrayMinSize,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

export class InventoryItemDto {
  @IsString()
  @IsNotEmpty()
  size: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

export class ProductImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  alt?: string;
}

// Coerce each element to a ProductImageDto instance ourselves (a legacy bare
// string becomes { url }). Doing the instantiation inside @Transform makes the
// result independent of class-transformer's @Type ordering, and @ValidateNested
// then validates the real instances.
export const toProductImageDtos = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((item) =>
        plainToInstance(
          ProductImageDto,
          typeof item === 'string' ? { url: item } : (item ?? {}),
        ),
      )
    : value;

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
  @ValidateNested({ each: true })
  @Transform(toProductImageDtos)
  images?: ProductImageDto[];

  @IsOptional()
  @IsString()
  stripePriceId?: string;
}
