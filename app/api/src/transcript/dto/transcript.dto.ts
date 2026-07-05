import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

/**
 * POST /transcript body: a public video URL and an optional preferred caption
 * language. camelCase at the API boundary like the other DTOs. This endpoint is
 * unauthenticated (a free SEO/organic tool), so the DTO is strict.
 */
export class TranscriptDto {
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url!: string;

  /** BCP-47-ish language hint (e.g. "en", "es", "pt-BR"). Optional. */
  @IsOptional()
  @IsString()
  @MaxLength(12)
  @Matches(/^[A-Za-z0-9-]+$/, { message: 'lang must be a language code' })
  lang?: string;
}
