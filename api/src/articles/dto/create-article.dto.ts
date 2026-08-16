import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ArticleStatus } from '@prisma/client';

export class CreateArticleDto {
  @IsString()
  section!: string;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @IsString()
  @MinLength(1)
  categoryBg!: string;

  @IsString()
  @MinLength(1)
  titleBg!: string;

  @IsOptional()
  @IsString()
  subtitleBg?: string;

  @IsOptional()
  @IsString()
  readTimeBg?: string;

  @IsOptional()
  @IsString()
  locationBg?: string;

  @IsOptional()
  @IsString()
  dateBg?: string;

  @IsOptional()
  @IsString()
  photoCreditBg?: string;

  @IsOptional()
  @IsString()
  endLabelBg?: string;

  @IsOptional()
  @IsString()
  speakerBg?: string;

  @IsOptional()
  @IsString()
  audioDuration?: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsString()
  heroMediaId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  galleryMediaIds?: string[];

  @IsOptional()
  @IsString()
  audioMediaId?: string;

  /** External video URL (YouTube, Vimeo, direct mp4, etc.). */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  videoUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  videoMediaId?: string | null;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsBoolean()
  sponsored?: boolean;

  @IsOptional()
  @IsBoolean()
  sourced?: boolean;

  @IsOptional()
  @IsString()
  sponsorName?: string | null;

  @IsOptional()
  @IsString()
  behindStoryBg?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  seoTitleBg?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  seoDescriptionBg?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];

  /** Block array validated lightly — shape enforced in service/CMS form. */
  @IsOptional()
  @IsArray()
  body?: unknown[];

  /**
   * Attach to a series (appends as last episode).
   * Pass null on update to detach. Order is managed on Series Manage via DnD.
   */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  seriesId?: string | null;
}
