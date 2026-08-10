import { IsOptional, IsString, MinLength } from 'class-validator'

export class SendDigestDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  seriesId?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  articleId?: string
}
