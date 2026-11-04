import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from "class-validator";

export class CheckoutDto {
    @IsUUID()
    @IsNotEmpty()
    reservationId: string;

    @IsNumber()
    @IsPositive()
    amount: number;
}