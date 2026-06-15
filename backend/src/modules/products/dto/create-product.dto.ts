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
// string becomes { url }), then @ValidateNested validates the real instances.
// This must be paired with @Type(() => ProductImageDto) on the property: the
// global pipe runs with transformOptions.enableImplicitConversion, which mangles
// nested-object array elements that have no declared @Type into `[]`, silently
// wiping every image. @Type tells class-transformer the element type so implicit
// conversion leaves the objects (and this transform's output) intact.
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
  @Type(() => ProductImageDto)
  @Transform(toProductImageDtos)
  images?: ProductImageDto[];

  @IsOptional()
  @IsString()
  stripePriceId?: string;
}
