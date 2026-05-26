import { Module } from "@nestjs/common";
import { AudienceController } from "./audience.controller";

@Module({ controllers: [AudienceController] })
export class AudienceModule {}
