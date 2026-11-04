import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

// Lua Scripts
const RESERVE_SEAT_LUA = `
  local soldKey = KEYS[1]
  local holdKey = KEYS[2]
  local seatNumber = ARGV[1]
  local userId = ARGV[2]
  local ttlSeconds = tonumber(ARGV[3])

  -- 1. Check if seat is permanently sold
  if redis.call('SISMEMBER', soldKey, seatNumber) == 1 then
    return -1 -- ALREADY_SOLD
  end
  
  -- 2. Check if seat is currently held (SET NX EX)
  -- If holdKey exists, return -2 (CURRENTLY_HELD)
  local holdSet = redis.call('SET', holdKey, userId, 'NX', 'EX', ttlSeconds)
  if not holdSet then
    return -2 -- CURRENTLY_HELD
  end
  return 1 -- SUCCESS
`;

const RELEASE_SEAT_LUA = `
  local holdKey = KEYS[1]
  local userId = ARGV[1]
  local force = ARGV[2] -- 'true' or 'false'
  -- Check if hold exists
  local currentHolder = redis.call('GET', holdKey)
  if not currentHolder then
    return 0 -- Key does not exist or already expired
  end
  -- Only the user who reserved it (or a system worker with force='true') can release it
  if force == 'true' or currentHolder == userId then
    redis.call('DEL', holdKey)
    return 1 -- RELEASED
  end
  return -1 -- FORBIDDEN (Not held by this user)
`;

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);
    private client: Redis;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const redisUrl = this.configService.get<string>('REDIS_URL');

        if (redisUrl) {
            this.client = new Redis(redisUrl, {
                tls: redisUrl.startsWith('rediss://') ? {} : undefined,
                maxRetriesPerRequest: null,
            });
        }
        else {
            this.client = new Redis({
                host: this.configService.get<string>('REDIS_HOST', 'localhost'),
                port: Number(this.configService.get<number>('REDIS_PORT', 6379)),
                password: this.configService.get<string>('REDIS_PASSWORD'),
                maxRetriesPerRequest: null,
            });
        }

        this.client.on("connect", () => this.logger.log('Connected to Redis'));
        this.client.on('error', (err) => this.logger.error('Redis error:', err));
    }

    onModuleDestroy() {
        this.client?.disconnect();
    }

    async reserveSeat(
        eventId: string,
        seatNumber: string,
        userId: string,
        ttlSeconds: number = 600,
    ): Promise<number> {
        const soldKey = `event:${eventId}:sold_seats`;
        const holdKey = `event:${eventId}:seat:${seatNumber}:hold`;
        return (await this.client.eval(
            RESERVE_SEAT_LUA,
            2,
            soldKey,
            holdKey,
            seatNumber,
            userId,
            ttlSeconds.toString(),
        )) as number;
    }

    async releaseSeat(
        eventId: string,
        seatNumber: string,
        userId: string,
        force: boolean = false,
    ): Promise<number> {
        const holdKey = `event:${eventId}:seat:${seatNumber}:hold`;
        return (await this.client.eval(
            RELEASE_SEAT_LUA,
            1,
            holdKey,
            userId,
            force ? 'true' : 'false',
        )) as number;
    }
}