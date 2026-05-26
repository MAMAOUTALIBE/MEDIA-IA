import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AuthService, JwtPayload } from "./auth.service";
import { IS_PUBLIC_KEY } from "./public.decorator";

declare module "express" {
  interface Request {
    user?: JwtPayload;
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    let token: string | undefined;
    if (header?.startsWith("Bearer ")) {
      token = header.slice(7).trim();
    } else if (req.cookies?.["cmr_at"]) {
      // Sprint 1: cookie-based session (HttpOnly + SameSite=Strict)
      token = req.cookies["cmr_at"] as string;
    }
    if (!token) {
      throw new UnauthorizedException("Missing Bearer token");
    }
    const payload = await this.auth.verify(token);
    req.user = payload;
    return true;
  }
}
