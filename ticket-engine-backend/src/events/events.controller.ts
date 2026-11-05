import { Controller, Get, Param, Sse } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { Observable } from 'rxjs';

@Controller('events')
export class EventsController {

    constructor(
        private readonly eventService: EventsService,
    ) { }

    @Get(':id/seats')
    async getSeatsSnapshot(@Param('id') id: string) {
        return this.eventService.getSeatsSnapshot(id);
    }

    @Sse(':id/seats/stream')
    streamSeats(@Param('id') id: string): Observable<MessageEvent> {
        return this.eventService.getSeatEventStream(id);
    }
}
