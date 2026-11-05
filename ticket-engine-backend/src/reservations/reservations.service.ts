import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HoldSeatDto } from './dto/hold-seat.dto.js';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReservationsService {
    private readonly logger = new Logger(ReservationsService.name);
    private readonly HOLD_TTL_SECONDS: number;

    constructor(
        private readonly prismaService: PrismaService,
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        @InjectQueue('reservations-queue') private readonly queue: Queue,

    ) {
        this.HOLD_TTL_SECONDS = this.configService.get<number>("HOLD_TTL_SECONDS") || 600;
    }

    async holdSeat(dto: HoldSeatDto) {
        const { eventId, seatNumber, userId } = dto;

        const seat = await this.prismaService.seat.findUnique({
            where: { eventId_seatNumber: { eventId, seatNumber } },
        });

        if (!seat) {
            throw new NotFoundException(`Seat ${seatNumber} not found for this event.`);
        }

        if (seat.status === 'CONFIRMED') {
            throw new ConflictException(`Seat ${seatNumber} has already been sold.`);
        }

        const redisResult = await this.redisService.reserveSeat(
            eventId,
            seatNumber,
            userId,
            this.HOLD_TTL_SECONDS,
        );

        if (redisResult === -1) {
            throw new ConflictException(`Seat ${seatNumber} is already sold.`);
        }
        if (redisResult === -2) {
            throw new ConflictException(
                `Seat ${seatNumber} is currently held by another user. try another seat.`,
            );
        }

        const expiresAt = new Date(Date.now() + this.HOLD_TTL_SECONDS * 1000);

        try {
            const reservation = await this.prismaService.$transaction(async (tx) => {
                await tx.seat.update({
                    where: { id: seat.id },
                    data: { status: "HELD" }
                });

                return tx.reservation.create({
                    data: {
                        eventId,
                        seatId: seat.id,
                        userId,
                        status: "PENDING",
                        expiresAt,
                    }
                });
            });

            await this.redisService.publish(`events:${eventId}:seats`, {
                eventId,
                seatNumber,
                status: "HELD",
            });

            await this.queue.add(
                'expire-hold',
                {
                    reservationId: reservation.id,
                    seatId: seat.id,
                    eventId,
                    seatNumber,
                    userId
                },
                {
                    delay: this.HOLD_TTL_SECONDS * 1000,
                    jobId: `expire-${reservation.id}`,
                    removeOnComplete: true,
                }
            );

            this.logger.log(
                `[Hold Created] Seat: ${seatNumber} held for ${userId}. Expired at ${expiresAt.toISOString()}`
            );

            return {
                success: true,
                reservationId: reservation.id,
                seatNumber,
                expiresAt,
            };
        }
        catch (err) {
            await this.redisService.releaseSeat(eventId, seatNumber, userId, true);
            this.logger.error(`Database error during hold, rolling back Redis:`, err);
            throw err;
        }
    }

    async getReservation(id: string) {
        const res = await this.prismaService.reservation.findUnique({
            where: { id },
            include: { seat: true, event: true },
        });
        if (!res) throw new NotFoundException('Reservation not found');
        return res;
    }

}
