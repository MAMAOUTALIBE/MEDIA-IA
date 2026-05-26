import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsGateway } from "./notifications.gateway";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}
