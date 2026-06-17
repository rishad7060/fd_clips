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
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { AuthContext, AuthedRequest } from '../auth/auth.types';
import { PlanTier } from '../persistence/store.types';
import { BillingService, CaptureResult, CheckoutOrder } from './billing.service';
import { PLANS } from './plans';

class CheckoutDto {
  @IsIn(['starter', 'pro'])
  tier!: Exclude<PlanTier, 'free'>;
}

class CaptureDto {
  @IsString()
  orderId!: string;
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

  /**
   * Start a PayPal Orders v2 checkout. Returns the approval URL + orderId.
   * In mock mode the URL is a local stub and orderId encodes org:tier.
   */
  @UseGuards(ClerkAuthGuard)
  @Post('billing/checkout')
  async checkout(@CurrentOrg() auth: AuthContext, @Body() dto: CheckoutDto): Promise<CheckoutOrder> {
    return this.billing.createOrder(auth.organizationId, dto.tier);
  }

  /**
   * Capture an approved PayPal order and grant the plan's monthly credits.
   * Returns { ok, plan, creditBalance }.
   */
  @UseGuards(ClerkAuthGuard)
  @Post('billing/capture')
  async capture(@CurrentOrg() auth: AuthContext, @Body() dto: CaptureDto): Promise<CaptureResult> {
    // Scope the capture to the caller's org: the grant target comes from the
    // order's custom_id, so assert it matches the authenticated org.
    return this.billing.captureOrder(dto.orderId, auth.organizationId);
  }

  /**
   * PayPal webhook. Public (no Clerk guard). Real-mode verification of the
   * webhook signature is a follow-up; in mock mode the unsigned JSON is trusted.
   * Requires the raw body — main.ts captures it as req.rawBody.
   */
  @Post('billing/webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: AuthedRequest & { rawBody?: Buffer },
  ): Promise<{ received: boolean; result: string }> {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify((req as any).body ?? {}));
    const result = await this.billing.handlePaypalWebhook(raw);
    return { received: true, result };
  }
}
