import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { AuthContext, AuthedRequest } from '../auth/auth.types';
import { PlanTier } from '../persistence/store.types';
import { BillingService, PlanStatus } from './billing.service';
import { PolarService } from './polar.service';
import { PLANS } from './plans';

class SubscribeDto {
  @IsIn(['starter', 'pro'])
  tier!: Exclude<PlanTier, 'free'>;
}

@Controller()
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly polar: PolarService,
  ) {}

  /** Public: list available plans/tiers. */
  @Get('plans')
  getPlans(): { plans: typeof PLANS } {
    return { plans: PLANS };
  }

  /** Current org credit balance + plan. */
  @UseGuards(ClerkAuthGuard)
  @Get('billing/balance')
  async balance(@CurrentOrg() auth: AuthContext): Promise<{ plan: PlanTier; creditBalance: number }> {
    return this.billing.getBalance(auth.organizationId);
  }

  /**
   * Current plan + balance + capability flags (watermark/editing/retention/
   * resolution + subscription status). The web reads this to gate the editor
   * and surface "remove watermark" upsells.
   */
  @UseGuards(ClerkAuthGuard)
  @Get('billing/plan')
  async planStatus(@CurrentOrg() auth: AuthContext): Promise<PlanStatus> {
    return this.billing.getPlanStatus(auth.organizationId);
  }

  /**
   * Start a Polar.sh checkout for a paid tier. Returns the hosted checkout URL
   * + id. In mock mode it auto-activates and grants credits.
   */
  @UseGuards(ClerkAuthGuard)
  @Post('billing/subscribe')
  async subscribe(
    @CurrentOrg() auth: AuthContext,
    @Body() dto: SubscribeDto,
  ): Promise<{ url: string; subscriptionId: string; mock: boolean; tier: string }> {
    return this.polar.createSubscription(auth.organizationId, dto.tier);
  }

  /** Cancel the org's Polar subscription (downgrades to free at period end). */
  @UseGuards(ClerkAuthGuard)
  @Post('billing/subscription/cancel')
  async cancelSubscription(
    @CurrentOrg() auth: AuthContext,
  ): Promise<{ ok: boolean; plan: PlanTier }> {
    return this.polar.cancelSubscription(auth.organizationId);
  }

  /**
   * Polar.sh webhook. Public (no Clerk guard). In real mode the Standard
   * Webhooks signature is verified (POLAR_WEBHOOK_SECRET) before any grant; in
   * mock mode the unsigned JSON is trusted. Requires the raw body — main.ts
   * captures it as req.rawBody.
   */
  @Post('billing/webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: AuthedRequest & { rawBody?: Buffer; headers: Record<string, string> },
  ): Promise<{ received: boolean; result: string }> {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify((req as any).body ?? {}));
    const result = await this.polar.handleWebhook(raw, req.headers as Record<string, string>);
    return { received: true, result };
  }
}
