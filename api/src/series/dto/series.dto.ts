import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { SeriesStatus } from '@prisma/client';

export class CreateSeriesDto {
  @IsString()
  @MinLength(1)
  titleBg!: string;

  @IsOptional()
  @IsString()
  descriptionBg?: string;

  @IsOptional()
  @IsEnum(SeriesStatus)
  status?: SeriesStatus;

  @IsOptional()
  @IsString()
  coverMediaId?: string;
}

export class UpdateSeriesDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  titleBg?: string;

  @IsOptional()
  @IsString()
  descriptionBg?: string;

  @IsOptional()
  @IsEnum(SeriesStatus)
  status?: SeriesStatus;

  @IsOptional()
  @IsString()
  coverMediaId?: string | null;
}

export class SetSeriesEpisodesDto {
  @IsArray()
  @IsString({ each: true })
  articleIds!: string[];
}
