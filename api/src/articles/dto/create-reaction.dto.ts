import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateReactionDto {
  @IsOptional()
  @IsIn(['RELATE'])
  kind?: 'RELATE';

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  visitorKey!: string;
}
