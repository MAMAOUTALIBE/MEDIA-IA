import { describe, expect, it } from "vitest";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { ROLES_KEY, type AppRole } from "./roles.decorator";

function makeContext(role: AppRole | undefined, required: AppRole[] | undefined): ExecutionContext {
  const reflector = new Reflector();
  // We won't use reflector lookup directly; instead inject pre-set metadata via mock.
  return {
    getHandler: () => function handler() {},
    getClass: () => function HandlerClass() {},
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { sub: "x", email: "x", role, name: "X" } : undefined }),
    }),
  } as unknown as ExecutionContext;
}

function makeReflectorStub(required?: AppRole[]): Reflector {
  const stub = {
    getAllAndOverride: (key: unknown) => (key === ROLES_KEY ? required : undefined),
  };
  return stub as unknown as Reflector;
}

function guardWith(required: AppRole[] | undefined, role: AppRole | undefined) {
  const guard = new RolesGuard(makeReflectorStub(required));
  const ctx = makeContext(role, required);
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
});
