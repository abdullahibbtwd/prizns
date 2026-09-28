import { SubmissionStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReplySubmissionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;

  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;
}
