import { Body, Controller, Get, Post, Req, UnauthorizedException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { Public } from "./public.decorator";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("login")
  @ApiOperation({ summary: "Login (returns JWT) — rate-limited 5/min/IP" })
  async login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Public()
  @Post("logout")
  @ApiOperation({ summary: "Stateless logout (client drops JWT)" })
  async logout() {
    return { ok: true };
  }

  @Get("me")
  @ApiOperation({ summary: "Current user from Bearer token" })
  async me(@Req() req: Request) {
    if (!req.user) throw new UnauthorizedException();
    const user = await this.auth.meFromPayload(req.user);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team,
      initials: user.initials,
      color: user.color,
    };
  }
}
