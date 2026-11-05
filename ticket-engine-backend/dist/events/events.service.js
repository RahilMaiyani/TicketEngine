var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventsService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Observable } from 'rxjs';
let EventsService = EventsService_1 = class EventsService {
    prisma;
    redis;
    logger = new Logger(EventsService_1.name);
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async getSeatsSnapshot(eventId) {
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
    getSeatEventStream(eventId) {
        const channel = `events:${eventId}:seats`;
        const subscriber = this.redis.getSubscriberClient();
        return new Observable((observer) => {
            subscriber.subscribe(channel, (err) => {
                if (err) {
                    this.logger.error(`Failed to subscribe to channel ${channel}:`, err);
                    observer.error(err);
                }
                else {
                    this.logger.log(`Client subscribed to SSE feed for channel: ${channel}`);
                }
            });
            const messageHandler = (chan, message) => {
                if (chan === channel) {
                    try {
                        const data = JSON.parse(message);
                        observer.next({ data });
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
            };
        });
    }
};
EventsService = EventsService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        RedisService])
], EventsService);
export { EventsService };
//# sourceMappingURL=events.service.js.map