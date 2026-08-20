import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCheckoutDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  /** Donor amount in EUR (field name kept for API compatibility). */
  amountBgn!: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  /** When set, ties the donation to a published story (“Support This Story”). */
  @IsOptional()
  @IsString()
  articleId?: string;
}
