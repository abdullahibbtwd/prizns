import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type EstimatedArrivalDayTypeDto = 'BUSINESS' | 'CALENDAR';

export class CheckoutItemDto {
  @IsString()
  @MinLength(1)
  productId!: string;

  @IsInt()
  @Min(1)
  @Max(20)
  qty!: number;
}

export class CreateShopCheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  successPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  cancelPath?: string;
}

export class CreateCodOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items!: CheckoutItemDto[];

  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  postal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}

export class TrackOrderDto {
  @IsString()
  @MinLength(4)
  @MaxLength(40)
  publicId!: string;

  @IsEmail()
  @MaxLength(200)
  email!: string;
}

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titleBg!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descriptionBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descriptionEn?: string;

  @IsInt()
  @Min(100)
  priceCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsInt()
  @Min(0)
  @Max(100000)
  stock!: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCod?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  estimatedArrivalMinDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  estimatedArrivalMaxDays?: number | null;

  @IsOptional()
  @IsIn(['BUSINESS', 'CALENDAR'])
  estimatedArrivalDayType?: EstimatedArrivalDayTypeDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  estimatedArrivalBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  estimatedArrivalEn?: string | null;

  @IsOptional()
  @IsString()
  imageMediaId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryMediaIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  slug?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  titleBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descriptionBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  descriptionEn?: string | null;

  @IsOptional()
  @IsInt()
  @Min(100)
  priceCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  allowCod?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  estimatedArrivalMinDays?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  estimatedArrivalMaxDays?: number | null;

  @IsOptional()
  @IsIn(['BUSINESS', 'CALENDAR'])
  estimatedArrivalDayType?: EstimatedArrivalDayTypeDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  estimatedArrivalBg?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  estimatedArrivalEn?: string | null;

  @IsOptional()
  @IsString()
  imageMediaId?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryMediaIds?: string[];
}
