import { Controller, Get, Query } from "@nestjs/common";
import { mediaAssets } from "../mocks/data-extra";

@Controller("media")
export class MediaController {
  @Get()
  list(@Query("type") type?: string) {
    let rows = [...mediaAssets];
    if (type && type !== "all") rows = rows.filter((m) => m.type === type);
    return { count: rows.length, items: rows };
  }
}
