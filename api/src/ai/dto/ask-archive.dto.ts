import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class AskArchiveDto {
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  question!: string

  @IsOptional()
  @IsIn(['bg', 'en'])
  lang?: 'bg' | 'en'
}
