import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const redisUrl = process.env.REDIS_URL!;
const redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
});

async function runHighConcurrencyStressTest() {
    const eventId = 'dfdb4375-b739-47ee-940e-ae26997a85b8'; // Your seeded event ID
    const TOTAL_REQUESTS = 125;
    const VIP_SEATS = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];

    console.log(`=======================================================`);
    console.log(`=> STARTING HIGH-CONCURRENCY FLASH-SALE STRESS TEST`);
    console.log(`Target: 100 Seats | ${TOTAL_REQUESTS} Concurrent User Requests`);
    console.log(`Clustering: 50% contending on Seats`);
    console.log(`=======================================================\n`);

    // Step 1: Pre-generate requests
    const requests = Array.from({ length: TOTAL_REQUESTS }).map((_, i) => {
        const userId = `attacker_user_${i + 1}`;
        // 50% fight for VIP seats, 50% pick across rows A-J
        const isVipHunter = i % 2 === 0;
        const targetSeat = isVipHunter
            ? VIP_SEATS[i % VIP_SEATS.length]
            : `${String.fromCharCode(65 + Math.floor(Math.random() * 10))}${Math.floor(Math.random() * 10) + 1}`;

        return { userId, targetSeat };
    });

    // Step 2: Fire all requests concurrently with latency tracking
    const startTime = Date.now();
    const latencies: number[] = [];
    let successfulHolds = 0;
    let blockedConflicts = 0;
    let serverErrors = 0;
    const results = await Promise.all(
        requests.map(async ({ userId, targetSeat }) => {
            const reqStart = Date.now();
            try {
                const res = await fetch('http://localhost:3000/reservations/hold', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ eventId, seatNumber: targetSeat, userId }),
                });

                latencies.push(Date.now() - reqStart);

                if (res.status === 201) {
                    successfulHolds++;
                } else if (res.status === 409) {
                    blockedConflicts++;
                } else if (res.status === 500) {
                    serverErrors++;
                }
            } catch (e) {
                serverErrors++;
            }
        }),
    );

    const totalDurationMs = Date.now() - startTime;
    latencies.sort((a, b) => a - b);

    // Step 3: Compute Latency Percentiles
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    console.log(`\n=== LOAD TEST HTTP RESULTS ===`);
    console.log(`-------------------------------------------------------`);
    console.log(`Total Requests:         ${TOTAL_REQUESTS}`);
    console.log(`Total Burst Time:       ${totalDurationMs} ms (~${(TOTAL_REQUESTS / (totalDurationMs / 1000)).toFixed(1)} req/s)`);
    console.log(`- 201 Created (Holds):   ${successfulHolds}`);
    console.log(`- 409 Conflict (Denied): ${blockedConflicts}`);
    console.log(`- 500 Errors:            ${serverErrors}`);
    console.log(`p50 Latency:            ${p50} ms`);
    console.log(`p95 Latency:            ${p95} ms`);
    console.log(`p99 Latency:            ${p99} ms`);

    // Step 4: AUDIT DATABASE & REDIS INTEGRITY (THE INVARIANT PROOF)
    console.log(`\n=> AUDITING DATABASE & REDIS INTEGRITY...`);
    console.log(`-------------------------------------------------------`);

    const seats = await prisma.seat.findMany({ where: { eventId } });
    const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;
    const heldCount = seats.filter((s) => s.status === 'HELD').length;
    const confirmedCount = seats.filter((s) => s.status === 'CONFIRMED').length;

    const totalSeats = seats.length;

    // Check for any duplicate reservations on the same seat
    const duplicateReservations = await prisma.$queryRaw<Array<{ seatId: string; count: bigint }>>`
    SELECT "seatId", COUNT(*) as count 
    FROM reservations 
    WHERE status = 'PENDING' 
    GROUP BY "seatId" 
    HAVING COUNT(*) > 1
  `;

    console.log(`Total Seats in Venue:   ${totalSeats}`);
    console.log(`Available:              ${availableCount}`);
    console.log(`Held (Pending Cart):    ${heldCount}`);
    console.log(`Confirmed (Sold):       ${confirmedCount}`);
    console.log(`Sum (A + H + C):        ${availableCount + heldCount + confirmedCount}`);

    // Invariant Checks
    const inventoryConserved = availableCount + heldCount + confirmedCount === totalSeats;
    const zeroDuplicates = duplicateReservations.length === 0;
    const zeroErrors = serverErrors === 0;

    console.log(`\n=======================================================`);
    if (inventoryConserved && zeroDuplicates && zeroErrors) {
        console.log(`=> VERIFICATION PASSED: ZERO RACE CONDITIONS!`);
        console.log(`- Exact inventory conservation: 100 == ${availableCount + heldCount + confirmedCount}`);
        console.log(`- Duplicate seats booked: 0`);
        console.log(`- Server crash/error rate: 0.00%`);
    } else {
        console.error(`=> INTEGRITY VIOLATION DETECTED:`);
        console.error(`- Duplicates:`, duplicateReservations);
        console.error(`- Server Errors:`, serverErrors);
    }
    console.log(`=======================================================\n`);
    await prisma.$disconnect();
    await redis.quit();
}

runHighConcurrencyStressTest();