import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { AppConfigService } from '../config/config.service';
import { DataStore, DATA_STORE, UserRole } from '../persistence/store.types';
import { PlansService } from '../plans/plans.service';

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

/** Body of the internal credentials-login call (admin + basic-user sign-in). */
class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

/** Body of the internal email/password registration call (basic users). */
class RegisterDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

/** Result of a successful credentials login (mirrors the Auth.js token shape). */
interface LoginResult {
  userId: string;
  organizationId: string;
  orgName: string;
  plan: string;
  role: UserRole;
  email: string;
  name: string | null;
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
    private readonly plans: PlansService,
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
      this.plans.freeTierCredits(),
    );
    return {
      userId: user.id,
      organizationId: organization.id,
      orgName: organization.name,
      plan: organization.plan,
    };
  }

  /**
   * Email/password registration for basic users. Called server-to-server by the
   * web app's /api/register route, gated by the same `x-internal-secret` as
   * /auth/sync. Hashes the password here (crypto stays in the API), provisions a
   * personal org, and returns the same shape as /auth/login so the web app can
   * immediately establish a session via the user-credentials provider.
   */
  @Post('register')
  @HttpCode(201)
  async register(
    @Headers('x-internal-secret') secret: string | undefined,
    @Body() dto: RegisterDto,
  ): Promise<LoginResult> {
    const expected = this.config.authInternalSecret;
    if (!expected || secret !== expected) {
      throw new ForbiddenException('Invalid internal secret');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const result = await this.store.registerUserWithPassword(
      { email: dto.email, name: dto.name, passwordHash },
      this.plans.freeTierCredits(),
    );
    if (!result) {
      throw new ConflictException('An account with that email already exists.');
    }
    const { user, organization } = result;
    return {
      userId: user.id,
      organizationId: organization.id,
      orgName: organization.name,
      plan: organization.plan,
      role: user.role,
      email: user.email,
      name: user.name,
    };
  }

  /**
   * Credentials login for admins. Called server-to-server by the web app's
   * Auth.js `authorize` callback (Credentials provider), gated by the same
   * `x-internal-secret` as /auth/sync. In MOCK mode (no internal secret set) the
   * header check is skipped — the bcrypt password check is still the real gate,
   * and the API is local-only. Never reachable from the browser.
   */
  @Post('login')
  @HttpCode(200)
  async login(
    @Headers('x-internal-secret') secret: string | undefined,
    @Body() dto: LoginDto,
  ): Promise<LoginResult> {
    const expected = this.config.authInternalSecret;
    if (expected && secret !== expected) {
      throw new ForbiddenException('Invalid internal secret');
    }
    const user = await this.store.adminGetUserByEmail(dto.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.store.adminTouchLogin(user.id);
    const org = await this.store.getOrganization(user.organizationId);
    return {
      userId: user.id,
      organizationId: user.organizationId,
      orgName: org?.name ?? 'Admin',
      plan: org?.plan ?? 'pro',
      role: user.role,
      email: user.email,
      name: user.name,
    };
  }
}
