import { Module } from "@nestjs/common";
import { ContentsController } from "./contents.controller";
import { NotificationsModule } from "../notifications/notifications.module";
import { WorkflowsModule } from "../workflows/workflows.module";

@Module({
  imports: [NotificationsModule, WorkflowsModule],
  controllers: [ContentsController],
})
export class ContentsModule {}
