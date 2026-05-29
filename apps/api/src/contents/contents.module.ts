import { Module } from "@nestjs/common";
import { ContentsController } from "./contents.controller";
import { ContentsService } from "./contents.service";
import { AiModule } from "../ai/ai.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WorkflowsModule } from "../workflows/workflows.module";

@Module({
  imports: [NotificationsModule, WorkflowsModule, AiModule],
  controllers: [ContentsController],
  providers: [ContentsService],
  exports: [ContentsService],
})
export class ContentsModule {}
