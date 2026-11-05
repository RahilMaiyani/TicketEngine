import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { Observable } from 'rxjs';
export declare class EventsService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    getSeatsSnapshot(eventId: string): Promise<{
        number: number;
        id: string;
        seatNumber: string;
        row: string;
        price: import("@prisma/client-runtime-utils").Decimal;
        status: import("@prisma/client").$Enums.SeatStatus;
    }[]>;
    getSeatEventStream(eventId: string): Observable<MessageEvent>;
}
