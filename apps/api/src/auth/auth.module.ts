import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RolesGuard } from "./roles.guard";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN_SECONDS = Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 8);

if (process.env.NODE_ENV === "production" && (!JWT_SECRET || JWT_SECRET.length < 64)) {
  throw new Error("JWT_SECRET must be set and ≥64 chars in production (ADR-006)");
}

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_SECRET ?? "dev-only-secret-replace-in-env-min-64-chars-aaaaaaaaaaaaaaaaaaaaaaaa",
      signOptions: {
        expiresIn: JWT_EXPIRES_IN_SECONDS,
        algorithm: "HS512",
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [AuthService],
})
export class AuthModule {}
