import { Controller, Get } from "@nestjs/common";
import { diffusionMatrix, diffusionStats } from "../mocks/data-extra";

@Controller("diffusion")
export class DiffusionController {
  @Get("matrix")
  matrix() {
    return { matrix: diffusionMatrix, stats: diffusionStats };
  }
}
