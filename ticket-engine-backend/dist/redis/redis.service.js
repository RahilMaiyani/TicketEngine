var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RedisService_1;
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
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
let RedisService = RedisService_1 = class RedisService {
    configService;
    logger = new Logger(RedisService_1.name);
    client;
    constructor(configService) {
        this.configService = configService;
    }
    onModuleInit() {
        const redisUrl = this.configService.get('REDIS_URL');
        if (redisUrl) {
            this.client = new Redis(redisUrl, {
                tls: redisUrl.startsWith('rediss://') ? {} : undefined,
                maxRetriesPerRequest: null,
            });
        }
        else {
            this.client = new Redis({
                host: this.configService.get('REDIS_HOST', 'localhost'),
                port: Number(this.configService.get('REDIS_PORT', 6379)),
                password: this.configService.get('REDIS_PASSWORD'),
                maxRetriesPerRequest: null,
            });
        }
        this.client.on("connect", () => this.logger.log('Connected to Redis'));
        this.client.on('error', (err) => this.logger.error('Redis error:', err));
    }
    onModuleDestroy() {
        this.client?.disconnect();
    }
    getClient() {
        return this.client;
    }
    async reserveSeat(eventId, seatNumber, userId, ttlSeconds = 600) {
        const soldKey = `event:${eventId}:sold_seats`;
        const holdKey = `event:${eventId}:seat:${seatNumber}:hold`;
        return (await this.client.eval(RESERVE_SEAT_LUA, 2, soldKey, holdKey, seatNumber, userId, ttlSeconds.toString()));
    }
    async releaseSeat(eventId, seatNumber, userId, force = false) {
        const holdKey = `event:${eventId}:seat:${seatNumber}:hold`;
        return (await this.client.eval(RELEASE_SEAT_LUA, 1, holdKey, userId, force ? 'true' : 'false'));
    }
};
RedisService = RedisService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], RedisService);
export { RedisService };
//# sourceMappingURL=redis.service.js.map