import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** URL-safe slug: lowercase letters, digits, hyphens only. */
const SLUG_PATTERN = /^[a-z0-9-]+$/;

/** Create a blog post (admin). All DTO fields are declared - forbidNonWhitelisted is global. */
export class CreateBlogPostDto {
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN, { message: 'slug must be URL-safe (lowercase letters, digits, hyphens)' })
  slug!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(300)
  description!: string;

  @IsString()
  @MaxLength(300)
  excerpt!: string;

  @IsString()
  @MaxLength(60)
  category!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags!: string[];

  @IsString()
  @MaxLength(120)
  author!: string;

  @IsString()
  bodyMarkdown!: string;

  @IsString()
  @MaxLength(300)
  heroAlt!: string;

  @IsBoolean()
  published!: boolean;

  /** ISO date/datetime string; defaults to now() if omitted. */
  @IsOptional()
  @IsISO8601()
  publishedAt?: string;
}

/** Partial update to a blog post (admin). Every field optional. */
export class UpdateBlogPostDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN, { message: 'slug must be URL-safe (lowercase letters, digits, hyphens)' })
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  author?: string;

  @IsOptional()
  @IsString()
  bodyMarkdown?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  heroAlt?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsISO8601()
  publishedAt?: string;
}
