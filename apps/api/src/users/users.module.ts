import { Module } from "@nestjs/common";
import { GdprController } from "./gdpr.controller";
import { GdprService } from "./gdpr.service";
import { UsersController } from "./users.controller";

@Module({
  controllers: [UsersController, GdprController],
  providers: [GdprService],
})
export class UsersModule {}
