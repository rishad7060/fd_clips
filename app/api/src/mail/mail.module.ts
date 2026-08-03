import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { MailService } from './mail.service';

/**
 * Transactional email (SMTP via nodemailer). Exports MailService so the queue
 * module can inject it into the pipeline worker to send "clips ready" mail.
 */
@Module({
  imports: [ConfigModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
