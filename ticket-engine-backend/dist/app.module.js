var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ReservationsModule } from './reservations/reservations.module.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            PrismaModule,
            RedisModule,
            ConfigModule.forRoot({ isGlobal: true }),
            BullModule.forRootAsync({
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (config) => {
                    const redisUrl = config.get("REDIS_URL");
                    if (redisUrl) {
                        const parsed = new URL(redisUrl);
                        return {
                            connection: {
                                host: parsed.hostname,
                                port: Number(parsed.port || 6379),
                                username: parsed.username || 'default',
                                password: parsed.password,
                                tls: parsed.protocol === 'rediss:' ? {} : undefined,
                                maxRetriesPerRequest: null,
                            }
                        };
                    }
                    return {
                        connection: {
                            host: config.get('REDIS_HOST', 'localhost'),
                            port: Number(config.get('REDIS_PORT', 6379)),
                            password: config.get('REDIS_PASSWORD'),
                            maxRetriesPerRequest: null,
                        }
                    };
                }
            }),
            ReservationsModule,
        ],
        controllers: [AppController],
        providers: [AppService],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map