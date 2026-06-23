import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsString } from 'class-validator';
import { AppAuthGuard } from '../auth/auth.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { AuthContext, AuthedRequest } from '../auth/auth.types';
import { PlanRecord, PlanTier } from '../persistence/store.types';
import { BillingService, PlanStatus } from './billing.service';
import { PolarService } from './polar.service';
import { PlansService } from '../plans/plans.service';

class SubscribeDto {
  @IsIn(['starter', 'pro'])
  tier!: Exclude<PlanTier, 'free'>;
}

class ConfirmCheckoutDto {
  @IsString()
  checkoutId!: string;
}

@Controller()
export class BillingController {
  constructor(
    private readonly billing: BillingService,
    private readonly polar: PolarService,
    private readonly plans: PlansService,
  ) {}

  /** Public: list available plans/tiers (live, admin-editable values). */
  @Get('plans')
  getPlans(): { plans: Record<PlanTier, PlanRecord> } {
    const map = {} as Record<PlanTier, PlanRecord>;
    for (const p of this.plans.getAll()) map[p.tier] = p;
    return { plans: map };
  }

  /** Current org credit balance + plan. */
  @UseGuards(AppAuthGuard)
  @Get('billing/balance')
  async balance(@CurrentOrg() auth: AuthContext): Promise<{ plan: PlanTier; creditBalance: number }> {
    return this.billing.getBalance(auth.organizationId);
  }

  /**
   * Current plan + balance + capability flags (watermark/editing/retention/
   * resolution + subscription status). The web reads this to gate the editor
   * and surface "remove watermark" upsells.
   */
  @UseGuards(AppAuthGuard)
  @Get('billing/plan')
  async planStatus(@CurrentOrg() auth: AuthContext): Promise<PlanStatus> {
    return this.billing.getPlanStatus(auth.organizationId);
  }

  /**
   * Start a Polar.sh checkout for a paid tier. Returns the hosted checkout URL
   * + id. In mock mode it auto-activates and grants credits.
   */
  @UseGuards(AppAuthGuard)
  @Post('billing/subscribe')
  async subscribe(
    @CurrentOrg() auth: AuthContext,
    @Body() dto: SubscribeDto,
  ): Promise<{ url: string; subscriptionId: string; mock: boolean; tier: string }> {
    return this.polar.createSubscription(auth.organizationId, dto.tier);
  }

  /**
   * Confirm a checkout after Polar redirects back (post-payment). Grants the
   * plan when webhooks can't reach this API (e.g. localhost). The paid status is
   * verified server-to-server with Polar; idempotent with the webhook grant.
   */
  @UseGuards(AppAuthGuard)
  @Post('billing/confirm')
  async confirm(
    @CurrentOrg() auth: AuthContext,
    @Body() dto: ConfirmCheckoutDto,
  ): Promise<{ plan: PlanTier; updated: boolean }> {
    return this.polar.confirmCheckout(auth.organizationId, dto.checkoutId);
  }

  /** Cancel the org's Polar subscription (downgrades to free at period end). */
  @UseGuards(AppAuthGuard)
  @Post('billing/subscription/cancel')
  async cancelSubscription(
    @CurrentOrg() auth: AuthContext,
  ): Promise<{ ok: boolean; plan: PlanTier }> {
    return this.polar.cancelSubscription(auth.organizationId);
  }

  /**
   * Polar.sh webhook. Public (no Clerk guard). In real mode the Standard
   * Webhooks signature is verified (POLAR_WEBHOOK_SECRET) before any grant; in
   * mock mode the unsigned JSON is trusted. Requires the raw body - main.ts
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
