import { WorkerHost } from "@nestjs/bullmq";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
import { Job } from "bullmq";
interface ExpireHoldJobData {
    reservationId: string;
    seatId: string;
    eventId: string;
    seatNumber: string;
    userId: string;
}
export declare class ReservationsProcessor extends WorkerHost {
    private readonly prisma;
    private readonly redis;
    private readonly logger;
    constructor(prisma: PrismaService, redis: RedisService);
    process(job: Job<ExpireHoldJobData>): Promise<void>;
}
export {};
