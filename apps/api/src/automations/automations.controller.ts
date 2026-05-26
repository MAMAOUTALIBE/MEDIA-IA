import { Body, Controller, Get, Param, Patch } from "@nestjs/common";
import { automationRules } from "../mocks/data-extra";

@Controller("automations")
export class AutomationsController {
  @Get()
  list() {
    return { count: automationRules.length, items: automationRules };
  }

  @Patch(":id")
  toggle(@Param("id") id: string, @Body() body: { active?: boolean }) {
    const rule = automationRules.find((r) => r.id === id);
    if (!rule) return { ok: false, error: "not_found" };
    if (typeof body.active === "boolean") rule.active = body.active;
    return { ok: true, rule };
  }
}
