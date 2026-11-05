var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ReservationsService_1;
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
let ReservationsService = ReservationsService_1 = class ReservationsService {
    prismaService;
    redisService;
    configService;
    queue;
    logger = new Logger(ReservationsService_1.name);
    HOLD_TTL_SECONDS;
    constructor(prismaService, redisService, configService, queue) {
        this.prismaService = prismaService;
        this.redisService = redisService;
        this.configService = configService;
        this.queue = queue;
        this.HOLD_TTL_SECONDS = this.configService.get("HOLD_TTL_SECONDS") || 600;
    }
    async holdSeat(dto) {
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
        const redisResult = await this.redisService.reserveSeat(eventId, seatNumber, userId, this.HOLD_TTL_SECONDS);
        if (redisResult === -1) {
            throw new ConflictException(`Seat ${seatNumber} is already sold.`);
        }
        if (redisResult === -2) {
            throw new ConflictException(`Seat ${seatNumber} is currently held by another user. try another seat.`);
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
            await this.queue.add('expire-hold', {
                reservationId: reservation.id,
                seatId: seat.id,
                eventId,
                seatNumber,
                userId
            }, {
                delay: this.HOLD_TTL_SECONDS * 1000,
                jobId: `expire-${reservation.id}`,
                removeOnComplete: true,
            });
            this.logger.log(`[Hold Created] Seat: ${seatNumber} held for ${userId}. Expired at ${expiresAt.toISOString()}`);
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
    async getReservation(id) {
        const res = await this.prismaService.reservation.findUnique({
            where: { id },
            include: { seat: true, event: true },
        });
        if (!res)
            throw new NotFoundException('Reservation not found');
        return res;
    }
};
ReservationsService = ReservationsService_1 = __decorate([
    Injectable(),
    __param(3, InjectQueue('reservations-queue')),
    __metadata("design:paramtypes", [PrismaService,
        RedisService,
        ConfigService,
        Queue])
], ReservationsService);
export { ReservationsService };
//# sourceMappingURL=reservations.service.js.map