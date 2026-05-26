import { Controller, Get, Param, NotFoundException, Query } from "@nestjs/common";
import { contents } from "../mocks/data";

@Controller("contents")
export class ContentsController {
  @Get()
  list(
    @Query("status") status?: string,
    @Query("type") type?: string,
    @Query("q") q?: string,
  ) {
    let rows = [...contents];
    if (status) rows = rows.filter((c) => c.status === status);
    if (type) rows = rows.filter((c) => c.type === type);
    if (q) {
      const needle = q.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.title.toLowerCase().includes(needle) ||
          (c.excerpt?.toLowerCase().includes(needle) ?? false),
      );
    }
    return { count: rows.length, items: rows };
  }

  @Get(":id")
  one(@Param("id") id: string) {
    const c = contents.find((x) => x.id === id);
    if (!c) throw new NotFoundException(`Content ${id} not found`);
    return c;
  }
}
