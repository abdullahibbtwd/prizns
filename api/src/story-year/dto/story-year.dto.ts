import { Transform, Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator'
import { StoryYearCampaignStatus } from '@prisma/client'

export class CreateStoryYearCampaignDto {
  @Type(() => Number)
  @IsInt()
  @Min(2020)
  year!: number

  @IsString()
  @MinLength(2)
  titleBg!: string

  @IsOptional()
  @IsString()
  titleEn?: string

  @IsOptional()
  @IsString()
  descriptionBg?: string

  @IsOptional()
  @IsString()
  descriptionEn?: string

  @IsOptional()
  @IsEnum(StoryYearCampaignStatus)
  status?: StoryYearCampaignStatus

  @IsOptional()
  @IsString()
  opensAt?: string

  @IsOptional()
  @IsString()
  closesAt?: string
}

export class UpdateStoryYearCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  titleBg?: string

  @IsOptional()
  @IsString()
  titleEn?: string | null

  @IsOptional()
  @IsString()
  descriptionBg?: string

  @IsOptional()
  @IsString()
  descriptionEn?: string | null

  @IsOptional()
  @IsEnum(StoryYearCampaignStatus)
  status?: StoryYearCampaignStatus

  @IsOptional()
  @IsString()
  opensAt?: string | null

  @IsOptional()
  @IsString()
  closesAt?: string | null
}

export class SetNominationsDto {
  @IsArray()
  @IsString({ each: true })
  articleIds!: string[]
}

export class CastStoryYearVoteDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  articleId!: string
}
