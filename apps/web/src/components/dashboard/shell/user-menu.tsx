"use client";

import { useState } from "react";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { currentUser as mockUser } from "@/lib/mocks/users";
import { ROLES } from "@/lib/constants";
import { useAuthStore } from "@/lib/stores/auth-store";
import { LoginDialog } from "./login-dialog";
import type { Role } from "@/types";

export function UserMenu() {
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [loginOpen, setLoginOpen] = useState(false);

  // Effective user: authentifié si on a un JWT, sinon le mock (démo)
  const user = authUser ?? mockUser;
  const isAuthenticated = !!authUser;
  const role = ROLES[user.role as Role] ?? ROLES.journalist;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Menu utilisateur"
          className="relative inline-flex shrink-0 rounded-full p-0.5 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent-violet"
        >
          <InitialsAvatar initials={user.initials} color={user.color} size={36} />
          {isAuthenticated && (
            <span
              aria-label="Connecté"
              className="absolute -bottom-0.5 -right-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full bg-success ring-2 ring-bg-base"
            >
              <ShieldCheck size={7} className="text-white" />
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 border-white/10 bg-popover/95 backdrop-blur-xl"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex items-center gap-3 px-1 py-1">
                <InitialsAvatar initials={user.initials} color={user.color} size={36} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{user.name}</p>
                  <p className="truncate text-xs text-text-secondary">{role.label}</p>
                </div>
              </div>
              <div className="mt-2 rounded-md bg-white/[0.04] px-2 py-1 text-[10px]">
                {isAuthenticated ? (
                  <span className="text-success">
                    <ShieldCheck size={9} className="mr-1 inline" />
                    Connecté JWT
                  </span>
                ) : (
                  <span className="text-text-muted">Mode démo · non authentifié</span>
                )}
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserRound size={16} className="mr-2" />
            Mon profil
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings size={16} className="mr-2" />
            Paramètres
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isAuthenticated ? (
            <DropdownMenuItem
              className="text-danger focus:text-danger"
              onClick={() => {
                void logout();
              }}
            >
              <LogOut size={16} className="mr-2" />
              Se déconnecter
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="text-accent-violet focus:text-accent-violet"
              onClick={() => setLoginOpen(true)}
            >
              <LogIn size={16} className="mr-2" />
              Se connecter
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
