import { BadRequestException, Body, Controller, Headers, Post } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';

@Controller('orders')
export class OrdersController {

    constructor(private readonly orderService: OrdersService) { }

    @Post('checkout')
    async checkout(
        @Body() dto: CheckoutDto,
        @Headers('idempotency-key') idempotencyKey?: string
    ) {
        if (!idempotencyKey) {
            throw new BadRequestException("Missing required header: idempotency-key")
        }
        return this.orderService.checkout(dto, idempotencyKey);
    }
}
