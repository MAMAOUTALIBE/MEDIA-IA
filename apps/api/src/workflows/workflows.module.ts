import { Module } from "@nestjs/common";
import { WorkflowsController } from "./workflows.controller";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [WorkflowsController],
})
export class WorkflowsModule {}
