import { OrdersService } from './orders.service.js';
import { CheckoutDto } from './dto/checkout.dto.js';
export declare class OrdersController {
    private readonly orderService;
    constructor(orderService: OrdersService);
    checkout(dto: CheckoutDto, idempotencyKey?: string): Promise<any>;
}
