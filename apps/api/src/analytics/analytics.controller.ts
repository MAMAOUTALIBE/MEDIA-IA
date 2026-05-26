import { Controller, Get } from "@nestjs/common";
import { engagementByDayOfWeek, topContents, topChannels } from "../mocks/data-extra";

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
