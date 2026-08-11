import { IsEnum, IsOptional, IsString } from 'class-validator'
import { ContactInquiryStatus } from '@prisma/client'

export class UpdateContactDto {
  @IsOptional()
  @IsEnum(ContactInquiryStatus)
  status?: ContactInquiryStatus

  @IsOptional()
  @IsString()
  notes?: string
}
