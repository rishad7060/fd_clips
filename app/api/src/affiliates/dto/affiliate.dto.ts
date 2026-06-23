import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body of POST /affiliates/attribute - the referral code from the `fd_ref` cookie. */
export class AttributeReferralDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;
}

/** Body of the public POST /affiliates/click - increments the link's click count. */
export class TrackClickDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;
}
