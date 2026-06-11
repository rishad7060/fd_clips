import { Inject, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JobProgressEvent, PROGRESS_BUS, ProgressBus } from './progress.types';

/**
 * WebSocket gateway relaying JobProgressEvents (CONTRACTS.md §4) to web clients.
 *
 * Clients emit `subscribe { job_id }` to join room `job:{job_id}`; the gateway
 * fans every progress event out to the matching room. Authorization note: in
 * real mode the socket handshake would carry the Clerk token and the gateway
 * would verify organization_id before joining; in MOCK_AUTH any client may
 * subscribe (single local org).
 */
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/ws' })
export class ProgressGateway implements OnGatewayConnection, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProgressGateway.name);
  private unsubscribe?: () => void;

  @WebSocketServer()
  server!: Server;

  constructor(@Inject(PROGRESS_BUS) private readonly bus: ProgressBus) {}

  onModuleInit(): void {
    this.unsubscribe = this.bus.subscribe((event: JobProgressEvent) => {
      this.server?.to(this.room(event.job_id)).emit('progress', event);
    });
    this.logger.log('Progress WebSocket gateway listening on namespace /ws');
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`WS client connected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { job_id?: string },
  ): { ok: boolean; room?: string } {
    if (!body?.job_id) return { ok: false };
    const room = this.room(body.job_id);
    client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { job_id?: string },
  ): { ok: boolean } {
    if (body?.job_id) client.leave(this.room(body.job_id));
    return { ok: true };
  }

  private room(jobId: string): string {
    return `job:${jobId}`;
  }
}
