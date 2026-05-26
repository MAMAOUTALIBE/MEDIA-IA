"use client";

import { InitialsAvatar } from "@/components/ui/initials-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, UserRound } from "lucide-react";
import { currentUser } from "@/lib/mocks/users";
import { ROLES } from "@/lib/constants";

export function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex shrink-0 rounded-full p-0.5 outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent-violet">
        <InitialsAvatar initials={currentUser.initials} color={currentUser.color} size={36} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 border-white/10 bg-popover/95 backdrop-blur-xl"
      >
        <DropdownMenuLabel>
          <div className="flex items-center gap-3 px-1 py-1">
            <InitialsAvatar initials={currentUser.initials} color={currentUser.color} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {currentUser.name}
              </p>
              <p className="truncate text-xs text-text-secondary">
                {ROLES[currentUser.role].label}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
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
        <DropdownMenuItem className="text-danger focus:text-danger">
          <LogOut size={16} className="mr-2" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
