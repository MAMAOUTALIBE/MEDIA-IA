import { Global, MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { CacheService } from "./cache.service";
import { FeatureFlagsController } from "./feature-flags.controller";
import { FeatureFlagsService } from "./feature-flags.service";
import { IdempotencyInterceptor } from "./idempotency.interceptor";
import { ProblemDetailsFilter } from "./problem-details.filter";
import { RequestIdMiddleware } from "./request-id.middleware";
import { TimeoutInterceptor } from "./timeout.interceptor";

@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
    // Order matters: idempotency must wrap the handler before the timeout so
    // cached replays don't get spuriously timed-out, and both run inside
    // request scope where Reflector + Request are available.
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    CacheService,
    FeatureFlagsService,
  ],
  exports: [CacheService, FeatureFlagsService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
