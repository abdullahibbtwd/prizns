import { IsString, MinLength } from 'class-validator'

export class AwardBadgeDto {
  @IsString()
  @MinLength(1)
  authorId!: string

  @IsString()
  @MinLength(1)
  badgeId!: string
}
