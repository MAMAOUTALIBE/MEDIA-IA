import { Global, Logger, Module, OnModuleInit } from "@nestjs/common";
import { EventBusService } from "./event-bus.service";
import { buildConnectors, fanOutPublication, type PublisherConnector } from "./connectors";
import { PrismaService } from "../prisma/prisma.service";
import type { ChannelKey } from "@prisma/client";

@Global()
@Module({
  providers: [
    EventBusService,
    {
      provide: "PUBLISHER_CONNECTORS",
      useFactory: () => buildConnectors(new Logger("Connectors")),
    },
  ],
  exports: [EventBusService, "PUBLISHER_CONNECTORS"],
})
export class PublishingModule implements OnModuleInit {
  constructor(
    private readonly bus: EventBusService,
    private readonly prisma: PrismaService,
  ) {}

  private readonly logger = new Logger(PublishingModule.name);
  private connectors!: Record<ChannelKey, PublisherConnector>;

  onModuleInit() {
    this.connectors = buildConnectors(new Logger("Connectors"));
    // Subscribe handler that fans out content.published events to all channels
    this.bus.subscribe("content.published", async (env) => {
      await fanOutPublication(env, this.prisma, this.connectors, this.logger);
    });
    this.logger.log("PublishingModule init — 9 connectors registered, subscribed to content.published");
  }
}
