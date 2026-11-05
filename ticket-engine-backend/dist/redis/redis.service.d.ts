import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private readonly logger;
    private client;
    private subClient;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    getClient(): Redis;
    getSubscriberClient(): Redis;
    reserveSeat(eventId: string, seatNumber: string, userId: string, ttlSeconds?: number): Promise<number>;
    releaseSeat(eventId: string, seatNumber: string, userId: string, force?: boolean): Promise<number>;
    publish(channel: string, message: any): Promise<number>;
}
