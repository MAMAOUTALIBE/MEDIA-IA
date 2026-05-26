import { Controller, Get, Query } from "@nestjs/common";
import { calendarEvents } from "../mocks/data-extra";

@Controller("calendar")
export class CalendarController {
  @Get()
  list(@Query("from") from?: string, @Query("to") to?: string) {
    let rows = [...calendarEvents];
    if (from) rows = rows.filter((e) => e.date >= from);
    if (to) rows = rows.filter((e) => e.date <= to);
    return { count: rows.length, items: rows };
  }
}
