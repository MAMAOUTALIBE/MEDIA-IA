import { Controller, Get } from "@nestjs/common";
import { ExactRoles } from "../auth/roles.decorator";
import { diffusionMatrix, diffusionStats } from "../mocks/data-extra";

@ExactRoles("editor", "chief", "direction", "community_manager", "admin")
@Controller("diffusion")
export class DiffusionController {
  @Get("matrix")
  matrix() {
    return { matrix: diffusionMatrix, stats: diffusionStats };
  }
}
