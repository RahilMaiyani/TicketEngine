import { IsUUID, IsNotEmpty, IsString } from 'class-validator';

export class HoldSeatDto {
    @IsUUID()
    @IsNotEmpty()
    eventId: string;

    @IsString()
    @IsNotEmpty()
    seatNumber: string;

    @IsString()
    @IsNotEmpty()
    userId: string;
}