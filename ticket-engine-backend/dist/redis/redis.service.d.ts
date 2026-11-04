import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private client;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    reserveSeat(eventId: string, seatNumber: string, userId: string, ttlSeconds?: number): Promise<number>;
    releaseSeat(eventId: string, seatNumber: string, userId: string, force?: boolean): Promise<number>;
}
