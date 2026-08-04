import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { AppConfigService } from '../config/config.service';

/**
 * Transactional email via SMTP (nodemailer). Currently sends the "your clips are
 * ready" notification when a job completes.
 *
 * SMTP creds come from .env (SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM).
 * When SMTP_HOST is NOT set the service is in LOG mode: it logs the intended
 * email and returns without sending, so local dev / CI never needs a mail server
 * and nothing crashes if creds are absent.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: AppConfigService) {}

  private get enabled(): boolean {
    return Boolean(this.config.smtpHost);
  }

  /** Lazily build (and cache) the nodemailer transport from env. */
  private getTransport(): Transporter | null {
    if (!this.enabled) return null;
    if (this.transporter) return this.transporter;
    const user = this.config.smtpUser;
    const pass = this.config.smtpPass;
    this.transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure,
      auth: user && pass ? { user, pass } : undefined,
    });
    return this.transporter;
  }

  /**
   * Send the "your clips are ready" email. Best-effort: never throws to the
   * caller (a mail failure must not fail an otherwise-successful job). Returns
   * true if a real send happened, false if it was logged/skipped.
   */
  async sendClipsReady(args: {
    to: string | null | undefined;
    clipsCount: number;
    jobId: string;
    /** ISO expiry of the soonest clip, if any, so the email can nudge a download. */
    expiresAt?: string | null;
  }): Promise<boolean> {
    const to = (args.to || '').trim();
    if (!to) {
      this.logger.warn(`Skipping clips-ready email for job ${args.jobId}: no recipient email.`);
      return false;
    }

    const clipsUrl = `${this.config.appBaseUrl}/jobs/${args.jobId}/clips`;
    const subject =
      args.clipsCount > 0
        ? `Your ${args.clipsCount} clip${args.clipsCount === 1 ? '' : 's'} ${args.clipsCount === 1 ? 'is' : 'are'} ready 🎬`
        : 'Your ClipsHQ job finished';
    const { html, text } = this.renderClipsReady(args, clipsUrl);

    if (!this.enabled) {
      // LOG mode: no SMTP configured. Surface the intent so it's reviewable.
      this.logger.log(
        `EMAIL (not sent - SMTP unset)\n  To: ${to}\n  From: ${this.config.mailFrom}\n  Subject: ${subject}\n  Link: ${clipsUrl}`,
      );
      return false;
    }

    try {
      const transport = this.getTransport();
      if (!transport) return false;
      await transport.sendMail({
        from: this.config.mailFrom,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Sent clips-ready email to ${to} for job ${args.jobId}.`);
      return true;
    } catch (err) {
      // Never fail the job on a mail error - log and move on.
      this.logger.error(`Failed to send clips-ready email to ${to}: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Send the "your job failed" email (best-effort, mirrors sendClipsReady's
   * never-throws contract). Sent from the worker's failure catch block so a
   * failed job still notifies the user (credits are refunded separately).
   */
  async sendJobFailed(args: {
    to: string | null | undefined;
    jobId: string;
    reason?: string | null;
  }): Promise<boolean> {
    const to = (args.to || '').trim();
    if (!to) {
      this.logger.warn(`Skipping job-failed email for job ${args.jobId}: no recipient email.`);
      return false;
    }

    const subject = 'Your ClipsHQ job failed';
    const { html, text } = this.renderJobFailed(args);

    if (!this.enabled) {
      this.logger.log(
        `EMAIL (not sent - SMTP unset)\n  To: ${to}\n  From: ${this.config.mailFrom}\n  Subject: ${subject}\n  Reason: ${args.reason ?? '(none)'}`,
      );
      return false;
    }

    try {
      const transport = this.getTransport();
      if (!transport) return false;
      await transport.sendMail({
        from: this.config.mailFrom,
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Sent job-failed email to ${to} for job ${args.jobId}.`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send job-failed email to ${to}: ${(err as Error).message}`);
      return false;
    }
  }

  private renderJobFailed(args: {
    jobId: string;
    reason?: string | null;
  }): { html: string; text: string } {
    const reasonLine = args.reason ? `Reason: ${args.reason}` : '';
    const creditsLine = 'Any credits charged for this job have been refunded to your account.';

    const text = [
      'Your ClipsHQ job failed',
      '',
      `Unfortunately job ${args.jobId} could not be completed.`,
      reasonLine,
      '',
      creditsLine,
      '',
      `${this.config.appBaseUrl}/dashboard`,
      '',
      '— ClipsHQ',
    ]
      .filter((line) => line !== '')
      .join('\n');

    const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0b0e16">
  <h1 style="font-size:20px;margin:0 0 8px">Your job failed</h1>
  <p style="font-size:15px;line-height:1.55;color:#3a4256;margin:0 0 8px">Unfortunately job ${args.jobId} could not be completed.</p>
  ${args.reason ? `<p style="font-size:14px;line-height:1.5;color:#8a90a2;margin:0 0 20px">${args.reason}</p>` : ''}
  <p style="font-size:13px;line-height:1.5;color:#8a90a2;margin:0 0 20px">${creditsLine}</p>
  <a href="${this.config.appBaseUrl}/dashboard" style="display:inline-block;background:#6d5efc;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">Go to dashboard</a>
  <p style="font-size:12px;color:#a3a8b8;margin:28px 0 0">— ClipsHQ</p>
</div>`.trim();

    return { html, text };
  }

  private renderClipsReady(
    args: { clipsCount: number; expiresAt?: string | null },
    clipsUrl: string,
  ): { html: string; text: string } {
    const expiryLine = args.expiresAt
      ? `Heads up: your clips are available until ${new Date(args.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}. Download them before then.`
      : '';
    const countLine =
      args.clipsCount > 0
        ? `We turned your video into ${args.clipsCount} ready-to-post short${args.clipsCount === 1 ? '' : 's'}, ranked by virality.`
        : 'Your job finished processing.';

    const text = [
      'Your clips are ready 🎬',
      '',
      countLine,
      '',
      `View & download: ${clipsUrl}`,
      expiryLine ? `\n${expiryLine}` : '',
      '',
      '— ClipsHQ',
    ].join('\n');

    const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0b0e16">
  <h1 style="font-size:20px;margin:0 0 8px">Your clips are ready 🎬</h1>
  <p style="font-size:15px;line-height:1.55;color:#3a4256;margin:0 0 20px">${countLine}</p>
  <a href="${clipsUrl}" style="display:inline-block;background:#6d5efc;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:12px">View &amp; download clips</a>
  ${expiryLine ? `<p style="font-size:13px;line-height:1.5;color:#8a90a2;margin:20px 0 0">${expiryLine}</p>` : ''}
  <p style="font-size:12px;color:#a3a8b8;margin:28px 0 0">— ClipsHQ</p>
</div>`.trim();

    return { html, text };
  }
}
