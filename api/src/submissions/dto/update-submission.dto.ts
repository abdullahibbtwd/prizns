import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { SubmissionStatus } from '@prisma/client';

export class UpdateSubmissionDto {
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Set false to change status without the automatic email. */
  @IsOptional()
  @IsBoolean()
  notifySubmitter?: boolean;
}
