import { Controller, Get, Query } from "@nestjs/common";
import { auditEvents } from "../mocks/data";

@Controller("audit")
export class AuditController {
  @Get()
  list(@Query("severity") severity?: string, @Query("q") q?: string) {
    let rows = [...auditEvents];
    if (severity && severity !== "all") {
      rows = rows.filter((e) => e.severity === severity);
    }
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.target.toLowerCase().includes(needle) ||
          e.action.toLowerCase().includes(needle),
      );
    }
    return {
      count: rows.length,
      items: rows,
      totals: {
        all: auditEvents.length,
        info: auditEvents.filter((e) => e.severity === "info").length,
        warning: auditEvents.filter((e) => e.severity === "warning").length,
        critical: auditEvents.filter((e) => e.severity === "critical").length,
        failures: auditEvents.filter((e) => e.status === "failure").length,
      },
    };
  }
}
