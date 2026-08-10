import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PartnershipStatus } from '@prisma/client';

export class UpdatePartnershipDto {
  @IsOptional()
  @IsEnum(PartnershipStatus)
  status?: PartnershipStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
