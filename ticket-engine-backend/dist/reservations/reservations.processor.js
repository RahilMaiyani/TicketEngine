var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReservationsProcessor_1;
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { RedisService } from "../redis/redis.service.js";
let ReservationsProcessor = ReservationsProcessor_1 = class ReservationsProcessor extends WorkerHost {
    prisma;
    redis;
    logger = new Logger(ReservationsProcessor_1.name);
    constructor(prisma, redis) {
        super();
        this.prisma = prisma;
        this.redis = redis;
    }
    async process(job) {
        if (job.name === 'expire-hold') {
            const { reservationId, seatId, eventId, seatNumber, userId } = job.data;
            this.logger.log(`Checking expiration for reservation ${reservationId}...`);
            const reservation = await this.prisma.reservation.findUnique({
                where: { id: reservationId }
            });
            if (!reservation || reservation.status !== 'PENDING') {
                this.logger.log(`Reservation ${reservationId} is already ${reservation?.status || 'NOT FOUND'}. No action needed.`);
                return;
            }
            await this.prisma.$transaction(async (tx) => {
                await tx.reservation.update({
                    where: { id: reservationId },
                    data: { status: 'EXPIRED' }
                });
                await tx.seat.update({
                    where: { id: seatId },
                    data: { status: 'AVAILABLE' },
                });
            });
            await this.redis.releaseSeat(eventId, seatNumber, userId, true);
            this.logger.warn(`[Hold Expired] Seat ${seatNumber} released back to availbale inventory.`);
        }
    }
};
ReservationsProcessor = ReservationsProcessor_1 = __decorate([
    Processor('reservations-queue', {
        drainDelay: 5000
    }),
    __metadata("design:paramtypes", [PrismaService,
        RedisService])
], ReservationsProcessor);
export { ReservationsProcessor };
//# sourceMappingURL=reservations.processor.js.map