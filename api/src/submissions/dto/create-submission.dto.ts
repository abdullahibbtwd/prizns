import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

function toOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const s = String(value).trim();
  return s.length ? s : undefined;
}

export class CreateSubmissionDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(1)
  place!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsString()
  @MinLength(1)
  story!: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalString(value))
  @IsString()
  links?: string;

  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return true;
    if (typeof value === 'boolean') return value;
    const s = String(value).toLowerCase();
    return s === 'true' || s === 'on' || s === '1' || s === 'yes';
  })
  @IsBoolean()
  ownWork!: boolean;
}
