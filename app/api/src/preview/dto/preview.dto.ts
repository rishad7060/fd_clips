import { IsUrl } from 'class-validator';

/**
 * POST /preview body. Just a single video URL to fetch lightweight metadata for
 * (no download). camelCase at the API boundary like the other DTOs; the web
 * client maps its snake_case shape to this and back.
 */
export class PreviewDto {
  @IsUrl({ require_protocol: true })
  url!: string;
}
