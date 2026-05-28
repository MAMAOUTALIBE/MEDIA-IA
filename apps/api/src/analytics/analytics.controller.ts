import { Controller, Get } from "@nestjs/common";
import { ExactRoles } from "../auth/roles.decorator";
import { engagementByDayOfWeek, topContents, topChannels } from "../mocks/data-extra";

@ExactRoles("chief", "direction", "community_manager", "admin")
@Controller("analytics")
export class AnalyticsController {
  @Get("deep")
  deep() {
    return {
      engagementByDayOfWeek,
      topContents,
      topChannels,
    };
  }
}
