import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReservationsService } from './reservations.service.js';
import { HoldSeatDto } from './dto/hold-seat.dto.js';

@Controller('reservations')
export class ReservationsController {
    constructor(private readonly reservationsService: ReservationsService) { }

    @Post('hold')
    async holdSeat(@Body() dto: HoldSeatDto) {
        return this.reservationsService.holdSeat(dto);
    }

    @Get(':id')
    async getReservation(@Param('id') id: string) {
        return this.reservationsService.getReservation(id);
    }
}
