import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAuthorDto {
  @IsString()
  @MinLength(1)
  nameBg!: string;

  @IsOptional()
  @IsString()
  roleBg?: string;

  @IsOptional()
  @IsString()
  locationBg?: string;

  @IsOptional()
  @IsString()
  quoteBg?: string;

  @IsOptional()
  @IsString()
  bioBg?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnAuthors?: boolean;

  @IsOptional()
  @IsString()
  userId?: string;
}
