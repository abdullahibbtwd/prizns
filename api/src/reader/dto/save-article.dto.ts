import { IsString, MinLength } from 'class-validator'

export class SaveArticleDto {
  @IsString()
  @MinLength(1)
  articleId!: string
}
