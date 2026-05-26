import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new UnauthorizedException("Email et mot de passe requis");
    }
    return this.auth.login(body.email, body.password);
  }

  @Post("logout")
  async logout() {
    // Stateless JWT — le client jette son token. Endpoint là par convention.
    return { ok: true };
  }

  @Get("me")
  async me(@Headers("authorization") auth?: string) {
    if (!auth?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing Bearer token");
    }
    const token = auth.slice(7);
    const payload = await this.auth.verify(token);
    const user = this.auth.meFromPayload(payload);
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
