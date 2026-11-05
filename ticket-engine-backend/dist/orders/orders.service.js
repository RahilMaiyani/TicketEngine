var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OrdersService_1;
import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
let OrdersService = OrdersService_1 = class OrdersService {
    prisma;
    redis;
    logger = new Logger(OrdersService_1.name);
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async checkout(dto, idempotencyKey) {
        if (!idempotencyKey) {
            throw new BadRequestException("Idenmpotency-Key header is required.");
        }
        const redis = this.redis.getClient();
        const idempKey = `idempotency:${idempotencyKey}`;
        const lockAcquired = await redis.set(idempKey, JSON.stringify({ status: "IN_PROGRESS" }), 'EX', 120, 'NX');
        if (!lockAcquired) {
            const existing = await redis.get(idempKey);
            if (existing) {
                const parsed = JSON.parse(existing);
                if (parsed.status === 'IN_PROGRESS') {
                    throw new ConflictException("A checkout request with this Idempotency-Key is currently being processed. Please wait.");
                }
                if (parsed.status === 'COMPLETED') {
                    this.logger.log(`[Idempotent Hit] Returning cached response for key: ${idempotencyKey}`);
                    return parsed.response;
                }
            }
        }
        try {
            const reservation = await this.prisma.reservation.findUnique({
                where: { id: dto.reservationId },
                include: { seat: true }
            });
            if (!reservation) {
                throw new NotFoundException("reservation not found.");
            }
            if (reservation.status === 'EXPIRED') {
                throw new ConflictException("Your 10-min hold has expired. Please select a seat again.");
            }
            if (reservation.status === 'CONFIRMED') {
                throw new ConflictException('This reservation has already been paid for.');
            }
            if (new Date() > reservation.expiresAt) {
                throw new ConflictException('Hold time has lapsed.');
            }
            const order = await this.prisma.$transaction(async (tx) => {
                await tx.reservation.update({
                    where: { id: reservation.id },
                    data: { status: 'CONFIRMED' },
                });
                await tx.seat.update({
                    where: { id: reservation.seatId },
                    data: { status: 'CONFIRMED' },
                });
                return tx.order.create({
                    data: {
                        reservationId: reservation.id,
                        userId: reservation.userId,
                        amount: dto.amount,
                        paymentStatus: 'COMPLETED',
                        idempotencyKey,
                    },
                });
            });
            await redis.sadd(`event:${reservation.eventId}:sold_seats`, reservation.seat.seatNumber);
            await redis.del(`event:${reservation.eventId}:seat:${reservation.seat.seatNumber}:hold`);
            const responsePayload = {
                success: true,
                orderId: order.id,
                seatNumber: reservation.seat.seatNumber,
                amount: reservation.seat.price,
                status: "PAID",
                confirmedAt: order.createdAt,
            };
            await redis.set(idempKey, JSON.stringify({ status: 'COMPLETED', response: responsePayload }), 'EX', 86400);
            await this.redis.publish(`events:${reservation.eventId}:seats`, {
                eventId: reservation.eventId,
                seatNumber: reservation.seat.seatNumber,
                status: "CONFIRMED",
            });
            this.logger.log(`[Order Completed] Seat ${reservation.seat.seatNumber} permanently confirmed for ${order.userId}`);
            return responsePayload;
        }
        catch (err) {
            await redis.del(idempKey);
            throw err;
        }
    }
};
OrdersService = OrdersService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        RedisService])
], OrdersService);
export { OrdersService };
//# sourceMappingURL=orders.service.js.map