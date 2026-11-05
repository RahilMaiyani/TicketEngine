import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Observable } from 'rxjs';

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) { }

    async getSeatsSnapshot(eventId: string) {
        return this.prisma.seat.findMany({
            where: { eventId },
            orderBy: [{ row: 'asc' }, { number: 'asc' }],
            select: {
                id: true,
                seatNumber: true,
                row: true,
                number: true,
                price: true,
                status: true,
            },
        });
    }

    getSeatEventStream(eventId: string): Observable<MessageEvent> {
        const channel = `events:${eventId}:seats`;
        const subscriber = this.redis.getSubscriberClient();

        return new Observable<MessageEvent>((observer) => {
            subscriber.subscribe(channel, (err) => {
                if (err) {
                    this.logger.error(`Failed to subscribe to channel ${channel}:`, err);
                    observer.error(err);
                } else {
                    this.logger.log(`Client subscribed to SSE feed for channel: ${channel}`);
                }
            }).catch((err) => {
                this.logger.error(`Failed to subscribe to channel ${channel}:`, err);
                observer.error(err);
            });

            const messageHandler = (chan: string, message: string) => {
                if (chan === channel) {
                    try {
                        const data = JSON.parse(message);
                        observer.next({ data } as MessageEvent);
                    }
                    catch (e) {
                        this.logger.error("Failed to parse Pub/Sub message", e);
                    }
                }
            };

            subscriber.on('message', messageHandler);

            return () => {
                this.logger.log(`Client disconnected from SSE feed: ${channel}`);
                subscriber.off('message', messageHandler);
            }
        });
    }

}
