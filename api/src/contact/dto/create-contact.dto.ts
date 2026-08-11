import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'

export class CreateContactDto {
  @IsString()
  @MinLength(1)
  name!: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(1)
  subject!: string

  @IsString()
  @MinLength(1)
  message!: string

  /** Honeypot — bots fill this; humans leave blank. */
  @IsOptional()
  @IsString()
  honeypot?: string
}
