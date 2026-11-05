import { EventsService } from './events.service.js';
import { Observable } from 'rxjs';
export declare class EventsController {
    private readonly eventService;
    constructor(eventService: EventsService);
    getSeatsSnapshot(id: string): Promise<{
        number: number;
        seatNumber: string;
        id: string;
        row: string;
        price: import("@prisma/client-runtime-utils").Decimal;
        status: import("@prisma/client").$Enums.SeatStatus;
    }[]>;
    streamSeats(id: string): Observable<MessageEvent>;
}
