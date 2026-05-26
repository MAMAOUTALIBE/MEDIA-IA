import { Controller, Get } from "@nestjs/common";
import { dashboardKpis, platformShares } from "../mocks/data";

@Controller("kpis")
export class KpisController {
  @Get()
  list() {
    return { items: dashboardKpis };
  }

  @Get("platforms")
  platforms() {
    return { items: platformShares };
  }
}
