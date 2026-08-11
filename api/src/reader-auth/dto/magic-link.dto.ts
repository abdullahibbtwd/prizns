import { Transform, Type } from 'class-transformer'
import {
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator'

class MagicLinkIntentDto {
  @IsIn(['save'])
  type!: 'save'

  @IsString()
  @MinLength(1)
  articleId!: string
}

export class RequestMagicLinkDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  @IsEmail()
  email!: string

  @IsOptional()
  @IsString()
  locale?: string

  @IsOptional()
  @IsString()
  returnUrl?: string

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MagicLinkIntentDto)
  intent?: MagicLinkIntentDto
}

export class VerifyMagicLinkDto {
  @IsString()
  @MinLength(16)
  token!: string
}
