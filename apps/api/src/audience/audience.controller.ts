import { Controller, Get, Query } from "@nestjs/common";
import { audience7d, audience30d, audience90d } from "../mocks/data-extra";

@Controller("audience")
export class AudienceController {
  @Get()
  series(@Query("range") range = "30d") {
    const map: Record<string, typeof audience7d> = {
      "7d": audience7d,
      "30d": audience30d,
      "90d": audience90d,
    };
    const items = map[range] ?? audience30d;
    return { range, count: items.length, items };
  }
}
