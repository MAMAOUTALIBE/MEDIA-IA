import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { AppRole, EXACT_ROLES_KEY, RANK, ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const exact = this.reflector.getAllAndOverride<AppRole[] | undefined>(EXACT_ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const required = this.reflector.getAllAndOverride<AppRole[] | undefined>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if ((!exact || exact.length === 0) && (!required || required.length === 0)) return true;

    const req = ctx.switchToHttp().getRequest<Request>();
    const userRole = req.user?.role as AppRole | undefined;
    if (!userRole) {
      throw new ForbiddenException("No role on request");
    }

    if (exact && exact.length > 0) {
      if (!exact.includes(userRole)) {
        throw new ForbiddenException(`Role '${userRole}' not allowed (need one of ${exact.join("|")})`);
      }
      return true;
    }

    if (!required || required.length === 0) return true;
    const minRank = Math.min(...required.map((r) => RANK[r] ?? 99));
    const userRank = RANK[userRole] ?? 0;
    if (userRank < minRank) {
      throw new ForbiddenException(`Role '${userRole}' insufficient (need ≥ ${required.join("|")})`);
    }
    return true;
  }
}
