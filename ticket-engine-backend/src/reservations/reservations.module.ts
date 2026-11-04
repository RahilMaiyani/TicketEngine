import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';
import { BullModule } from '@nestjs/bullmq';
import { ReservationsProcessor } from './reservations.processor.js';

@Module({
  imports: [
    BullModule.registerQueue({
      name: "reservations-queue",
    }),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsProcessor],
  exports: [ReservationsService]
})
export class ReservationsModule { }
