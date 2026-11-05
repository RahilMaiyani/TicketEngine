import { ReservationsService } from './reservations.service.js';
import { HoldSeatDto } from './dto/hold-seat.dto.js';
export declare class ReservationsController {
    private readonly reservationsService;
    constructor(reservationsService: ReservationsService);
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
            eventId: string;
            seatNumber: string;
            id: string;
            row: string;
            price: import("@prisma/client-runtime-utils").Decimal;
            status: import("@prisma/client").$Enums.SeatStatus;
            version: number;
        };
    } & {
        eventId: string;
        userId: string;
        id: string;
        status: import("@prisma/client").$Enums.ReservationStatus;
        seatId: string;
        expiresAt: Date;
        idempotencyKey: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
