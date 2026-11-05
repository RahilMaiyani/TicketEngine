import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
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

@Processor('reservations-queue', {
    drainDelay: 5000
})
export class ReservationsProcessor extends WorkerHost {
    private readonly logger = new Logger(ReservationsProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {
        super();
    }

    async process(job: Job<ExpireHoldJobData>): Promise<void> {
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

            await this.redis.publish(`events:${eventId}:seats`, {
                eventId,
                seatNumber,
                status: "AVAILABLE",
            });

            this.logger.warn(
                `[Hold Expired] Seat ${seatNumber} released back to available inventory.`,
            );
        }
    }
}