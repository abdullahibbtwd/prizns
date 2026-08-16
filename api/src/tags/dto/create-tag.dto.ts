import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { TagKind } from '@prisma/client';

export class CreateTagDto {
  @IsEnum(TagKind)
  kind!: TagKind;

  @IsString()
  @MinLength(1)
  nameBg!: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(41)
  @Max(45)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(22)
  @Max(29)
  lng?: number;
}
