import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AppRole, RANK, ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const userRole = req.user?.role as AppRole | undefined;
    if (!userRole) {
      throw new ForbiddenException("No role on request");
    }
    const minRank = Math.min(...required.map((r) => RANK[r] ?? 99));
    const userRank = RANK[userRole] ?? 0;
    if (userRank < minRank) {
      throw new ForbiddenException(`Role '${userRole}' insufficient (need ≥ ${required.join("|")})`);
    }
    return true;
  }
}
