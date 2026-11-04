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
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ReservationsService } from './reservations.service.js';
import { HoldSeatDto } from './dto/hold-seat.dto.js';
let ReservationsController = class ReservationsController {
    reservationsService;
    constructor(reservationsService) {
        this.reservationsService = reservationsService;
    }
    async holdSeat(dto) {
        return this.reservationsService.holdSeat(dto);
    }
    async getReservation(id) {
        return this.reservationsService.getReservation(id);
    }
};
__decorate([
    Post('hold'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [HoldSeatDto]),
    __metadata("design:returntype", Promise)
], ReservationsController.prototype, "holdSeat", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReservationsController.prototype, "getReservation", null);
ReservationsController = __decorate([
    Controller('reservations'),
    __metadata("design:paramtypes", [ReservationsService])
], ReservationsController);
export { ReservationsController };
//# sourceMappingURL=reservations.controller.js.map