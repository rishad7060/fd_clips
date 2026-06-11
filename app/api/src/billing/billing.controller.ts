import {
  Body,
  Controller,
  Get,
  Headers,
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
import { BillingService } from './billing.service';
import { PLANS } from './plans';

class CheckoutDto {
  @IsIn(['starter', 'pro'])
  tier!: Exclude<PlanTier, 'free'>;
}

@Controller()
export class BillingController {
  constructor(private readonly billing: BillingService) {}

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

  /** Start a subscription checkout (mock returns a local URL). */
  @UseGuards(ClerkAuthGuard)
  @Post('billing/checkout')
  async checkout(@CurrentOrg() auth: AuthContext, @Body() dto: CheckoutDto) {
    return this.billing.createCheckout(auth.organizationId, dto.tier);
  }

  /**
   * Stripe webhook. Public (no Clerk guard); verified by Stripe signature in
   * real mode. Requires the raw body — main.ts captures it as req.rawBody.
   */
  @Post('billing/webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: AuthedRequest & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ): Promise<{ received: boolean; result: string }> {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify((req as any).body ?? {}));
    const result = await this.billing.handleWebhook(raw, signature);
    return { received: true, result };
  }
}
