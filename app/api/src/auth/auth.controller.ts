import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Inject,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { AppConfigService } from '../config/config.service';
import { DataStore, DATA_STORE } from '../persistence/store.types';
import { FREE_TIER_CREDITS } from '../billing/plans';

/**
 * Body of the internal provisioning call made by the web server (Auth.js
 * `signIn` callback) after a successful Google sign-in.
 */
class SyncUserDto {
  @IsString()
  googleId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

/** What the web server stores in the Auth.js JWT after provisioning. */
interface SyncUserResult {
  userId: string;
  organizationId: string;
  orgName: string;
  plan: string;
}

/**
 * Internal auth endpoints. `POST /auth/sync` is NOT protected by the user JWT
 * guard (the user has no app token yet at sign-in time); instead it requires a
 * shared `x-internal-secret` header that only the web server knows. It is a
 * server-to-server call and is never reachable from the browser.
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly config: AppConfigService,
    @Inject(DATA_STORE) private readonly store: DataStore,
  ) {}

  @Post('sync')
  @HttpCode(200)
  async sync(
    @Headers('x-internal-secret') secret: string | undefined,
    @Body() dto: SyncUserDto,
  ): Promise<SyncUserResult> {
    const expected = this.config.authInternalSecret;
    // In mock-auth mode there is no real provisioning flow; reject so the web
    // app falls back to its dev user instead of silently creating records.
    if (!expected || secret !== expected) {
      throw new ForbiddenException('Invalid internal secret');
    }
    const { user, organization } = await this.store.provisionUserByGoogleId(
      {
        googleId: dto.googleId,
        email: dto.email,
        name: dto.name ?? null,
        avatarUrl: dto.avatarUrl ?? null,
      },
      FREE_TIER_CREDITS,
    );
    return {
      userId: user.id,
      organizationId: organization.id,
      orgName: organization.name,
      plan: organization.plan,
    };
  }
}
