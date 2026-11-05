import { RedisService } from '../redis/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HoldSeatDto } from './dto/hold-seat.dto.js';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
export declare class ReservationsService {
    private readonly prismaService;
    private readonly redisService;
    private readonly configService;
    private readonly queue;
    private readonly logger;
    private readonly HOLD_TTL_SECONDS;
    constructor(prismaService: PrismaService, redisService: RedisService, configService: ConfigService, queue: Queue);
    holdSeat(dto: HoldSeatDto): Promise<{
        success: boolean;
        reservationId: string;
        seatNumber: string;
        expiresAt: Date;
    }>;
    getReservation(id: string): Promise<{
        event: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string;
            description: string | null;
            startsAt: Date;
            totalSeats: number;
        };
        seat: {
            number: number;
            id: string;
            eventId: string;
            status: import("@prisma/client").$Enums.SeatStatus;
            seatNumber: string;
            row: string;
            price: import("@prisma/client-runtime-utils").Decimal;
            version: number;
        };
    } & {
        id: string;
        eventId: string;
        seatId: string;
        userId: string;
        status: import("@prisma/client").$Enums.ReservationStatus;
        expiresAt: Date;
        idempotencyKey: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
