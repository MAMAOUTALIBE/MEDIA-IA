import { Controller, Get, Param, NotFoundException } from "@nestjs/common";
import { users } from "../mocks/data";

@Controller("users")
export class UsersController {
  @Get()
  list() {
    return { count: users.length, items: users };
  }

  @Get(":id")
  one(@Param("id") id: string) {
    const u = users.find((x) => x.id === id);
    if (!u) throw new NotFoundException();
    return u;
  }
}
