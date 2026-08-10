import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePartnershipDto {
  @IsString()
  @MinLength(1)
  organization!: string;

  @IsString()
  @MinLength(1)
  contactName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsString()
  @MinLength(1)
  type!: string;

  @IsOptional()
  @IsString()
  budget?: string;

  @IsString()
  @MinLength(1)
  message!: string;

  /** Honeypot — bots fill this; humans leave blank. */
  @IsOptional()
  @IsString()
  honeypot?: string;
}
