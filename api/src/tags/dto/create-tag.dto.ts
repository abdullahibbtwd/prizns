import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
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
}
