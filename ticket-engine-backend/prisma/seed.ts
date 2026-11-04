import { PrismaClient } from "@prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Seeding intial event and 100 seats...");

    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.seat.deleteMany();
    await prisma.event.deleteMany();

    const event = await prisma.event.create({
        data: {
            title: "Grand Symphone Concert",
            description: "Exclusive performances",
            startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            totalSeats: 100,
        },
    });

    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatData = [];

    for (const row of rows) {
        for (let num = 1; num <= 10; num++) {
            const seatNumber = `${row}${num}`;
            const price = ['A', 'B', 'C'].includes(row) ? 150.0 : ['D', 'E', 'F', 'G'].includes(row) ? 100.0 : 75.0;

            seatData.push({
                eventId: event.id,
                seatNumber,
                row,
                number: num,
                price,
                status: "AVAILABLE" as const,
                version: 0,
            });
        }
    }

    await prisma.seat.createMany({
        data: seatData,
    });

    console.log(`Successfully seeded Event "${event.title} (ID: ${event.id}) with ${seatData.length} seats!`);

}

main().catch((e) => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prisma.$disconnect();
});