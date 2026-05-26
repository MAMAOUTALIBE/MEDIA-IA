import { Module } from "@nestjs/common";
import { ContentsController } from "./contents.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [ContentsController],
})
export class ContentsModule {}
