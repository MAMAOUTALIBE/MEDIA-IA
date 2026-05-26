import { Module } from "@nestjs/common";
import { DiffusionController } from "./diffusion.controller";

@Module({ controllers: [DiffusionController] })
export class DiffusionModule {}
