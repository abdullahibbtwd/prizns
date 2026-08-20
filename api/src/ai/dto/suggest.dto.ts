import { IsOptional, IsString, MaxLength } from 'class-validator'

export class AiSuggestDto {
  @IsOptional()
  @IsString()
  articleId?: string

  @IsString()
  @MaxLength(500)
  titleBg!: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  subtitleBg?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  section?: string

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  bodyText?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationBg?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  categoryBg?: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lang?: 'bg' | 'en'
}
