import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Resolved feature flags. Each external dependency (DB, Redis, Clerk, Polar.sh)
 * has a mock fallback so the API boots locally with an empty .env.
 */
export interface ResolvedFlags {
  /** auto | true | false - mirrors pipeline/config.py MOCK_MODE semantics. */
  mockMode: boolean;
  /** When true, an Authorization header is not required; a fake org is injected. */
  mockAuth: boolean;
  /** When true, the in-memory queue is used instead of BullMQ/Redis. */
  mockQueue: boolean;
  /** When true, the in-memory store is used instead of Prisma/Postgres. */
  mockDb: boolean;
  /** When true, signed URLs are faked. */
  mockStorage: boolean;
  /** When true, billing is stubbed (no Polar token); checkout grants locally. */
  mockBilling: boolean;
  /**
   * When true, clip keys are served as local-disk files over HTTP via the
   * /files controller instead of (mock-)R2 signed URLs. Defaults true when the
   * real pipeline is enabled (USE_REAL_PIPELINE=true) so locally produced
   * clips are reachable by the browser.
   */
  localFiles: boolean;
  /**
   * When true (env USE_REAL_PIPELINE=true), the in-memory queue drives the
   * RealPipelineWorker (spawns pipeline/run.py) instead of the MockWorker.
   * Opt-in only; defaults to false so the mock path stays the default.
   */
  useRealPipeline: boolean;
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

  /**
   * Shared HMAC secret used to verify the app's own (HS256) API access tokens,
   * minted by the web app's Auth.js session callback. Its presence is what flips
   * auth from MOCK to real.
   */
  get authJwtSecret(): string | undefined {
    return this.get<string>('AUTH_JWT_SECRET', undefined);
  }

  /**
   * Shared secret the web server presents on the internal `POST /auth/sync`
   * call (header `x-internal-secret`) to provision a user/org. Never exposed to
   * the browser.
   */
  get authInternalSecret(): string | undefined {
    return this.get<string>('AUTH_INTERNAL_SECRET', undefined);
  }

  // ── Polar.sh (payment provider) ──────────────────────────────────────────
  // Organization Access Token (polar_oat_...). When absent, billing runs in
  // MOCK mode (local grant, no real checkout). This is the single switch that
  // flips real vs mock billing.
  get polarAccessToken(): string | undefined {
    return this.get<string>('POLAR_ACCESS_TOKEN', undefined);
  }

  /** Polar REST API base. Defaults to the sandbox host. */
  get polarBaseUrl(): string {
    return this.get<string>('POLAR_BASE_URL', 'https://sandbox-api.polar.sh');
  }

  /** 'sandbox' | 'production' - informational; the base URL drives the host. */
  get polarMode(): string {
    return this.get<string>('POLAR_MODE', 'sandbox');
  }

  /** Pre-created Polar product id (UUID) for the Starter monthly subscription. */
  get polarProductStarter(): string | undefined {
    return this.get<string>('POLAR_PRODUCT_STARTER', undefined);
  }

  /** Pre-created Polar product id (UUID) for the Pro monthly subscription. */
  get polarProductPro(): string | undefined {
    return this.get<string>('POLAR_PRODUCT_PRO', undefined);
  }

  /**
   * Polar webhook secret (whsec_... or base64). Polar follows the Standard
   * Webhooks spec; required in real mode to verify webhook signatures.
   */
  get polarWebhookSecret(): string | undefined {
    return this.get<string>('POLAR_WEBHOOK_SECRET', undefined);
  }

  /** Where the provider returns the buyer after a successful checkout. */
  get billingReturnUrl(): string {
    return this.get<string>('BILLING_SUCCESS_URL', 'http://localhost:3000/billing?ok=1');
  }

  get billingCancelUrl(): string {
    return this.get<string>('BILLING_CANCEL_URL', 'http://localhost:3000/billing?canceled=1');
  }

  /**
   * Public base URL of the web app (no trailing slash). Used to build affiliate
   * referral links (`${appBaseUrl}/?ref=CODE`). Defaults to the local web dev
   * server.
   */
  get appBaseUrl(): string {
    return this.get<string>('WEB_APP_URL', 'http://localhost:3000').replace(/\/$/, '');
  }

  /**
   * Global default affiliate commission rate (0–1, e.g. 0.30 = 30% of each paid
   * invoice from a referred org). This is the fallback; an admin can override it
   * globally (stored) or per-affiliate. Invalid/absent → 0.30.
   */
  get affiliateCommissionRate(): number {
    const n = parseFloat(this.get<string>('AFFILIATE_COMMISSION_RATE', '0.30'));
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.3;
  }

  get r2Bucket(): string {
    return this.get<string>('R2_BUCKET', 'focaldive-clips');
  }

  get r2Endpoint(): string | undefined {
    return this.get<string>('R2_ENDPOINT', undefined);
  }

  /**
   * Public base URL the browser uses to reach this API (no trailing slash).
   * Derived from API_PUBLIC_URL, else built from API_PORT, default
   * http://localhost:4000. Used by StorageService to build /files/... URLs.
   */
  get apiPublicUrl(): string {
    const explicit = this.get<string>('API_PUBLIC_URL', undefined);
    const base = explicit && explicit.trim() !== '' ? explicit : `http://localhost:${this.apiPort}`;
    return base.replace(/\/$/, '');
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
    // Self-hosted auth (Auth.js + Google). Real auth is enabled when the shared
    // HS256 secret used to verify the app's API tokens is present.
    const hasAuth = this.hasValue('AUTH_JWT_SECRET');
    // Polar.sh is the payment provider. Real billing is enabled when a Polar
    // Organization Access Token is present.
    const hasPolar = this.hasValue('POLAR_ACCESS_TOKEN');
    const hasR2 = this.hasValue('R2_ACCESS_KEY_ID') && this.hasValue('R2_ENDPOINT');

    // auto => mock when the relevant cred is missing. Forced overrides everything.
    const mockMode = forced ?? !(hasDb && hasRedis && hasAuth && hasPolar);

    // MOCK_AUTH explicit flag wins; otherwise mock when the auth secret is absent.
    const mockAuthRaw = (this.config.get<string>('MOCK_AUTH') ?? '').toLowerCase();
    const mockAuth = mockAuthRaw === 'true' ? true : mockAuthRaw === 'false' ? false : !hasAuth;

    // LOCAL_FILES explicit flag wins; otherwise default true when the real
    // pipeline is enabled (its clips live on local disk, not R2).
    const useRealPipeline = (this.config.get<string>('USE_REAL_PIPELINE') ?? '').toLowerCase() === 'true';
    const localFilesRaw = (this.config.get<string>('LOCAL_FILES') ?? '').toLowerCase();
    const localFiles =
      localFilesRaw === 'true' ? true : localFilesRaw === 'false' ? false : useRealPipeline;

    return {
      mockMode,
      mockAuth,
      mockQueue: forced === true ? true : !hasRedis,
      mockDb: forced === true ? true : !hasDb,
      mockStorage: forced === true ? true : !hasR2,
      // Billing is money - never force MOCK when a real Polar token is present
      // (a stray MOCK_MODE=true in prod must NOT enable the forgeable mock-grant
      // path). Mock only when the token is genuinely absent.
      mockBilling: hasPolar ? false : true,
      localFiles,
      useRealPipeline,
    };
  }

  private logBanner(): void {
    const f = this.flags;
    this.logger.log('YT Shorts Clips API - feature flags resolved:');
    this.logger.log(`  MOCK_MODE   = ${f.mockMode}`);
    this.logger.log(`  auth        = ${f.mockAuth ? 'MOCK (fake org injected)' : 'Google OAuth (app JWT)'}`);
    this.logger.log(`  database    = ${f.mockDb ? 'IN-MEMORY (no Postgres)' : 'Postgres via Prisma'}`);
    this.logger.log(`  queue       = ${f.mockQueue ? 'IN-MEMORY (no Redis)' : 'BullMQ/Redis'}`);
    this.logger.log(`  storage     = ${f.mockStorage ? 'MOCK signed URLs' : 'Cloudflare R2'}`);
    this.logger.log(`  localFiles  = ${f.localFiles ? `LOCAL disk via ${this.apiPublicUrl}/files` : 'off'}`);
    this.logger.log(`  billing     = ${f.mockBilling ? 'STUBBED (no Polar token)' : `Polar.sh (${this.polarMode})`}`);
    this.logger.log(`  pipeline    = ${f.useRealPipeline ? 'REAL (spawns pipeline/run.py)' : 'MOCK worker'}`);
    if (f.mockMode) {
      this.logger.warn('Running in MOCK MODE - no external services required.');
    }
  }
}
