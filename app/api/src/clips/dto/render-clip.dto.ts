import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** One edited subtitle word (clip-relative seconds) from the inline editor. */
export interface EditedWord {
  word: string;
  start: number;
  end: number;
}

/** POST /clips/render body - re-render one clip with a new trim and/or style. */
export class RenderClipDto {
  @IsString()
  jobId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  rank!: number;

  /** New trim start (seconds); omit to keep the current start. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  start?: number;

  /** New trim end (seconds); omit to keep the current end. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  end?: number;

  /** Caption style (web shape {template,font,highlight_color,alignment,font_size}). */
  @IsOptional()
  @IsObject()
  style?: Record<string, unknown>;

  /**
   * Edited subtitle words (clip-relative seconds) from the inline editor. When
   * present, the renderer burns THESE instead of re-deriving from the transcript.
   */
  @IsOptional()
  @IsArray()
  captions?: EditedWord[];
}
