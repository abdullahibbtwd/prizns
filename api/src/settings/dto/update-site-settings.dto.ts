import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const SMTP_SECURITY_VALUES = ['none', 'starttls', 'ssl'] as const;
export type SmtpSecurityDto = (typeof SMTP_SECURITY_VALUES)[number];

/**
 * Omitted fields are left unchanged. An empty string clears a value
 * (for secrets: removes the saved key so the env fallback applies).
 */
export class UpdateSiteSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtubeUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tiktokUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  photographerCreditName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photographerCreditUrl?: string;

  @IsOptional()
  @IsBoolean()
  shopPublic?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(10000, { each: true })
  donationPresets?: number[];

  @IsOptional()
  @IsString()
  @MaxLength(300)
  stripeSecretKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  stripeWebhookSecret?: string;

  @IsOptional()
  @IsBoolean()
  smtpEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  smtpUser?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  smtpPassword?: string;

  @IsOptional()
  @IsIn(SMTP_SECURITY_VALUES)
  smtpSecurity?: SmtpSecurityDto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  mailFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mailFromName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  adminNotifyEmail?: string;

  @IsOptional()
  @IsBoolean()
  notifyAdminOnSubmission?: boolean;

  @IsOptional()
  @IsBoolean()
  notifySubmitterOnReceipt?: boolean;

  @IsOptional()
  @IsBoolean()
  notifySubmitterOnDecision?: boolean;
}

export class TestEmailDto {
  @IsOptional()
  @IsEmail()
  to?: string;
}
