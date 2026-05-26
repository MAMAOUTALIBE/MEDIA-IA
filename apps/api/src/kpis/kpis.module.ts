import { Module } from "@nestjs/common";
import { KpisController } from "./kpis.controller";

@Module({ controllers: [KpisController] })
export class KpisModule {}
