import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/roles.decorator";
import { workflowInstances } from "../mocks/data";
import { NotificationsGateway } from "../notifications/notifications.gateway";

@ApiTags("workflows")
@Controller("workflows")
export class WorkflowsController {
  constructor(private readonly notifications: NotificationsGateway) {}

  @Get()
  list() {
    return {
      count: workflowInstances.length,
      items: workflowInstances,
      stepCounts: {
        1: workflowInstances.filter((w) => w.currentStep === 1).length,
        2: workflowInstances.filter((w) => w.currentStep === 2).length,
        3: workflowInstances.filter((w) => w.currentStep === 3).length,
        4: workflowInstances.filter((w) => w.currentStep === 4).length,
        5: workflowInstances.filter((w) => w.currentStep === 5).length,
      },
    };
  }

  @Roles("editor")
  @Post(":id/advance")
  advance(@Param("id") id: string, @Body() body: { comment?: string } = {}) {
    const wf = workflowInstances.find((w) => w.id === id);
    if (!wf) throw new NotFoundException(`Workflow ${id} introuvable`);
    if (wf.currentStep === 5) {
      return { ok: false, reason: "already_published", workflow: wf };
    }
    const previous = wf.currentStep;
    wf.currentStep = (wf.currentStep + 1) as 1 | 2 | 3 | 4 | 5;

    this.notifications.broadcast("workflow.advanced", {
      id: wf.id,
      contentTitle: wf.contentTitle,
      previousStep: previous,
      newStep: wf.currentStep,
      comment: body.comment ?? null,
      at: new Date().toISOString(),
    });

    return { ok: true, workflow: wf, previousStep: previous };
  }
}
