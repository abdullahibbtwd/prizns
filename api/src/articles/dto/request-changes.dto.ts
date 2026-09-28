import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RequestChangesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  note!: string;
}
