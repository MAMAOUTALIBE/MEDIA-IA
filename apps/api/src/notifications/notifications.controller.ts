import { Controller, Get } from "@nestjs/common";
import { mentions, systemAlerts, workflowInstances } from "../mocks/data";

@Controller("notifications")
export class NotificationsController {
  @Get()
  all() {
    return {
      mentions: {
        items: mentions,
        unread: mentions.filter((m) => m.unread).length,
      },
      system: {
        items: systemAlerts,
        count: systemAlerts.length,
      },
      validations: {
        // pending workflows act as validation tasks
        items: workflowInstances.map((w) => ({
          id: w.id,
          title: w.contentTitle,
          step: w.currentStep,
          pendingFor: w.pendingFor,
          author: w.author,
        })),
        count: workflowInstances.length,
      },
    };
  }

  @Get("mentions")
  mentionsOnly() {
    return { items: mentions, unread: mentions.filter((m) => m.unread).length };
  }

  @Get("system")
  systemOnly() {
    return { items: systemAlerts };
  }
}
