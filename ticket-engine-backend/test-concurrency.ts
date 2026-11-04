import 'dotenv/config';
import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL!;
const redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
});

const RESERVE_SEAT_LUA = `
  local soldKey = KEYS[1]
  local holdKey = KEYS[2]
  local seatNumber = ARGV[1]
  local userId = ARGV[2]
  local ttlSeconds = tonumber(ARGV[3])

  if redis.call('SISMEMBER', soldKey, seatNumber) == 1 then
    return -1
  end

  local holdSet = redis.call('SET', holdKey, userId, 'NX', 'EX', ttlSeconds)
  if not holdSet then
    return -2
  end

  return 1
`;

async function runRaceTest() {
    const eventId = 'test-concert-1';
    const targetSeat = 'A1';
    const CONCURRENT_ATTEMPTS = 50;

    console.log(`\nSimulating ${CONCURRENT_ATTEMPTS} users fighting for Seat ${targetSeat} at the EXACT same time...\n`);

    // Clear previous test keys
    await redis.del(`event:${eventId}:seat:${targetSeat}:hold`);
    await redis.del(`event:${eventId}:sold_seats`);

    // Launch 50 promises simultaneously (Promise.all)
    const results = await Promise.all(
        Array.from({ length: CONCURRENT_ATTEMPTS }).map(async (_, index) => {
            const userId = `user_${index + 1}`;
            const res = (await redis.eval(
                RESERVE_SEAT_LUA,
                2,
                `event:${eventId}:sold_seats`,
                `event:${eventId}:seat:${targetSeat}:hold`,
                targetSeat,
                userId,
                60,
            )) as number;

            return { userId, status: res };
        }),
    );

    const winners = results.filter((r) => r.status === 1);
    const losers = results.filter((r) => r.status === -2);

    console.log(`Success (Holds Granted): ${winners.length}`);
    console.log(`Conflicts (Blocked):     ${losers.length}`);
    console.log(`Winner:                  ${winners[0]?.userId}`);

    // INVARIANT CHECK
    if (winners.length === 1 && losers.length === CONCURRENT_ATTEMPTS - 1) {
        console.log('\nINVARIANT PASSED: Exactly 1 user held the seat. ZERO double bookings!\n');
    } else {
        console.error('\nRACE CONDITION DETECTED: Multiple users acquired the seat!\n');
    }

    await redis.quit();
}

runRaceTest();