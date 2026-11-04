import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
export declare class OrdersService {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    checkout(dto: CheckoutDto, idempotencyKey: string): Promise<any>;
}
