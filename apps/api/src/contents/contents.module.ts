import { Module } from "@nestjs/common";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";
import { NotificationsModule } from "../notifications/notifications.module";
import { WorkflowsModule } from "../workflows/workflows.module";

@Module({
  imports: [NotificationsModule, WorkflowsModule],
  controllers: [ContentsController],
  providers: [ContentsService],
  exports: [ContentsService],
})
export class ContentsModule {}
