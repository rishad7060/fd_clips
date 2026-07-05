import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Public waitlist-join payload. Email is required; name/source are optional
 * (source is a free-text capture tag, e.g. 'landing-hero'). The controller
 * whitelists these fields (forbidNonWhitelisted), so nothing else is accepted.
 */
export class JoinWaitlistDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}
