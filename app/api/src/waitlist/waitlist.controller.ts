import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { JoinWaitlistDto } from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';

/**
 * Public (unauthenticated) waitlist endpoint. Like POST /affiliates/click, this
 * takes visitor input with no auth guard. Admin listing/export/delete lives on
 * the AdminController (behind AdminGuard).
 */
@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Post()
  @HttpCode(200)
  join(@Body() dto: JoinWaitlistDto): Promise<{ ok: true; already: boolean }> {
    return this.waitlist.join(dto);
  }
}
