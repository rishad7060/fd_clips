import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Resolved feature flags. Each external dependency (DB, Redis, Clerk, Stripe)
 * has a mock fallback so the API boots locally with an empty .env.
 */
export interface ResolvedFlags {
  /** auto | true | false — mirrors pipeline/config.py MOCK_MODE semantics. */
  mockMode: boolean;
  /** When true, an Authorization header is not required; a fake org is injected. */
  mockAuth: boolean;
  /** When true, the in-memory queue is used instead of BullMQ/Redis. */
  mockQueue: boolean;
  /** When true, the in-memory store is used instead of Prisma/Postgres. */
  mockDb: boolean;
  /** When true, signed URLs are faked and Stripe is stubbed. */
  mockStorage: boolean;
  mockBilling: boolean;
}

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  readonly flags: ResolvedFlags;

  constructor(private readonly config: ConfigService) {
    this.flags = this.resolveFlags();
    this.logBanner();
  }

  get<T = string>(key: string, fallback?: T): T {
    const v = this.config.get<T>(key);
    return (v === undefined || v === '' ? fallback : v) as T;
  }

  get apiPort(): number {
    return parseInt(this.get<string>('API_PORT', '4000'), 10);
  }

  get databaseUrl(): string | undefined {
    return this.get<string>('DATABASE_URL', undefined);
  }

  get redisUrl(): string | undefined {
    return this.get<string>('REDIS_URL', undefined);
  }

  get clerkSecretKey(): string | undefined {
    return this.get<string>('CLERK_SECRET_KEY', undefined);
  }

  get clerkJwksUrl(): string | undefined {
    return this.get<string>('CLERK_JWKS_URL', undefined);
  }

  get stripeSecretKey(): string | undefined {
    return this.get<string>('STRIPE_SECRET_KEY', undefined);
  }

  get stripeWebhookSecret(): string | undefined {
    return this.get<string>('STRIPE_WEBHOOK_SECRET', undefined);
  }

  get r2Bucket(): string {
    return this.get<string>('R2_BUCKET', 'focaldive-clips');
  }

  get r2Endpoint(): string | undefined {
    return this.get<string>('R2_ENDPOINT', undefined);
  }

  private hasValue(key: string): boolean {
    const v = this.config.get<string>(key);
    return v !== undefined && v.trim() !== '';
  }

  /**
   * MOCK_MODE: auto => true when no keys are present.
   * Individual subsystems also flip to mock when their own creds are absent,
   * so the app always boots regardless of MOCK_MODE.
   */
  private resolveFlags(): ResolvedFlags {
    const raw = (this.config.get<string>('MOCK_MODE') ?? 'auto').toLowerCase();
    const forced = raw === 'true' ? true : raw === 'false' ? false : undefined;

    const hasDb = this.hasValue('DATABASE_URL');
    const hasRedis = this.hasValue('REDIS_URL');
    const hasClerk = this.hasValue('CLERK_SECRET_KEY');
    const hasStripe = this.hasValue('STRIPE_SECRET_KEY');
    const hasR2 = this.hasValue('R2_ACCESS_KEY_ID') && this.hasValue('R2_ENDPOINT');

    // auto => mock when the relevant cred is missing. Forced overrides everything.
    const mockMode = forced ?? !(hasDb && hasRedis && hasClerk && hasStripe);

    // MOCK_AUTH explicit flag wins; otherwise mock when Clerk key absent.
    const mockAuthRaw = (this.config.get<string>('MOCK_AUTH') ?? '').toLowerCase();
    const mockAuth = mockAuthRaw === 'true' ? true : mockAuthRaw === 'false' ? false : !hasClerk;

    return {
      mockMode,
      mockAuth,
      mockQueue: forced === true ? true : !hasRedis,
      mockDb: forced === true ? true : !hasDb,
      mockStorage: forced === true ? true : !hasR2,
      mockBilling: forced === true ? true : !hasStripe,
    };
  }

  private logBanner(): void {
    const f = this.flags;
    this.logger.log('FocalDive Clips API — feature flags resolved:');
    this.logger.log(`  MOCK_MODE   = ${f.mockMode}`);
    this.logger.log(`  auth        = ${f.mockAuth ? 'MOCK (fake org injected)' : 'Clerk JWT'}`);
    this.logger.log(`  database    = ${f.mockDb ? 'IN-MEMORY (no Postgres)' : 'Postgres via Prisma'}`);
    this.logger.log(`  queue       = ${f.mockQueue ? 'IN-MEMORY (no Redis)' : 'BullMQ/Redis'}`);
    this.logger.log(`  storage     = ${f.mockStorage ? 'MOCK signed URLs' : 'Cloudflare R2'}`);
    this.logger.log(`  billing     = ${f.mockBilling ? 'STUBBED (no Stripe)' : 'Stripe'}`);
    if (f.mockMode) {
      this.logger.warn('Running in MOCK MODE — no external services required.');
    }
  }
}
