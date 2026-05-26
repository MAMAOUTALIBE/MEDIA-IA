import { Controller, Get } from "@nestjs/common";
import { workflowInstances } from "../mocks/data";

@Controller("workflows")
export class WorkflowsController {
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
}
