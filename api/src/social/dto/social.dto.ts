import { ArrayMinSize, IsArray, IsString, MinLength } from 'class-validator'
import { IsIn, IsOptional } from 'class-validator'

export class GenerateSocialDto {
  @IsString()
  @MinLength(1)
  articleId!: string
}

export class UpdateSocialPostDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  body?: string

  @IsOptional()
  @IsString()
  hashtags?: string

  @IsOptional()
  @IsIn(['DRAFT', 'APPROVED'])
  status?: 'DRAFT' | 'APPROVED'
}

export class UpdateSocialPlatformsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  platforms!: string[]
}
