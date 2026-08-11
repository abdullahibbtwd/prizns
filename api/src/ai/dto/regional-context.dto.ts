import { IsIn, IsOptional, IsString, MinLength } from 'class-validator'

export class RegionalContextDto {
  @IsString()
  @MinLength(1)
  section!: string

  @IsString()
  @MinLength(1)
  slug!: string

  @IsOptional()
  @IsIn(['bg', 'en'])
  lang?: 'bg' | 'en'
}
