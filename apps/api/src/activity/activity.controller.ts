import { Controller, Get } from "@nestjs/common";
import { recentActivity } from "../mocks/data-extra";

@Controller("activity")
export class ActivityController {
  @Get()
  list() {
    return { count: recentActivity.length, items: recentActivity };
  }
}
