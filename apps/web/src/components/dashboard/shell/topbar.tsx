"use client";

import { UserMenu } from "./user-menu";
import { NotificationsPopover } from "./notifications-popover";
import { CommandPaletteTrigger } from "./command-palette";

export function Topbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-bg-base/70 px-4 backdrop-blur-2xl lg:px-6">
      <div className="ml-12 flex-1 lg:ml-0">
        <CommandPaletteTrigger />
      </div>
      <NotificationsPopover />
      <UserMenu />
    </header>
  );
}
