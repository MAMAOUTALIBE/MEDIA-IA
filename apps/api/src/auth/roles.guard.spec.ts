import { describe, expect, it } from "vitest";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { EXACT_ROLES_KEY, ROLES_KEY, type AppRole } from "./roles.decorator";

function makeContext(role: AppRole | undefined): ExecutionContext {
  // We won't use reflector lookup directly; instead inject pre-set metadata via mock.
  return {
    getHandler: () => function handler() {},
    getClass: () => function HandlerClass() {},
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { sub: "x", email: "x", role, name: "X" } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

function makeReflectorStub(required?: AppRole[], exact?: AppRole[]): Reflector {
  const stub = {
    getAllAndOverride: (key: unknown) => {
      if (key === EXACT_ROLES_KEY) return exact;
      if (key === ROLES_KEY) return required;
      return undefined;
    },
  };
  return stub as unknown as Reflector;
}

function guardWith(required: AppRole[] | undefined, role: AppRole | undefined, exact?: AppRole[]) {
  const guard = new RolesGuard(makeReflectorStub(required, exact));
  const ctx = makeContext(role);
  return () => guard.canActivate(ctx);
}

describe("RolesGuard", () => {
  it("autorise quand aucun rôle requis", () => {
    expect(guardWith(undefined, "journalist")()).toBe(true);
  });

  it("autorise quand liste vide", () => {
    expect(guardWith([], "journalist")()).toBe(true);
  });

  it("refuse si pas de role sur la requête", () => {
    expect(() => guardWith(["admin"], undefined)()).toThrow(ForbiddenException);
  });

  it("admin (rank 5) ≥ editor (rank 2) → autorisé", () => {
    expect(guardWith(["editor"], "admin")()).toBe(true);
  });

  it("journalist (rank 1) < editor (rank 2) → refusé", () => {
    expect(() => guardWith(["editor"], "journalist")()).toThrow(ForbiddenException);
  });

  it("editor (rank 2) ≥ editor → autorisé", () => {
    expect(guardWith(["editor"], "editor")()).toBe(true);
  });

  it("chief (rank 3) < admin (rank 5) → refusé", () => {
    expect(() => guardWith(["admin"], "chief")()).toThrow(ForbiddenException);
  });

  it("avec plusieurs roles requis prend le min rank", () => {
    expect(guardWith(["chief", "admin"], "chief")()).toBe(true);
    expect(() => guardWith(["chief", "admin"], "editor")()).toThrow(ForbiddenException);
  });

  it("ExactRoles autorise seulement les rôles listés sans promotion hiérarchique", () => {
    expect(guardWith(undefined, "community_manager", ["community_manager", "admin"])()).toBe(true);
    expect(guardWith(undefined, "admin", ["community_manager", "admin"])()).toBe(true);
    expect(() => guardWith(undefined, "direction", ["community_manager", "admin"])()).toThrow(
      ForbiddenException,
    );
  });

  it("ExactRoles a priorité sur Roles quand les deux métadonnées existent", () => {
    expect(() => guardWith(["editor"], "chief", ["admin"])()).toThrow(ForbiddenException);
    expect(guardWith(["editor"], "admin", ["admin"])()).toBe(true);
  });
});
