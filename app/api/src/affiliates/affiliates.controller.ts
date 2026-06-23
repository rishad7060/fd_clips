import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AppAuthGuard } from '../auth/auth.guard';
import { CurrentOrg } from '../auth/current-org.decorator';
import { AuthContext } from '../auth/auth.types';
import { AffiliatesService } from './affiliates.service';
import { AffiliateView } from './affiliates.mapper';
import { AttributeReferralDto, TrackClickDto } from './dto/affiliate.dto';

/**
 * Affiliate / referral endpoints. `me` and `attribute` are creator-scoped (behind
 * AppAuthGuard); `click` is public so the link-landing page can register a click
 * before the visitor authenticates.
 */
@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliates: AffiliatesService) {}

  @Get('me')
  @UseGuards(AppAuthGuard)
  me(@CurrentOrg() auth: AuthContext): Promise<AffiliateView> {
    return this.affiliates.getMine(auth.organizationId);
  }

  @Post('attribute')
  @UseGuards(AppAuthGuard)
  @HttpCode(200)
  attribute(@CurrentOrg() auth: AuthContext, @Body() dto: AttributeReferralDto) {
    return this.affiliates.attribute(auth.organizationId, dto.code, auth.email);
  }

  @Post('click')
  @HttpCode(200)
  click(@Body() dto: TrackClickDto) {
    return this.affiliates.trackClick(dto.code);
  }
}
