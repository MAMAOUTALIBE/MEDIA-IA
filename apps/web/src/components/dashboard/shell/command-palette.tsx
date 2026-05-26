"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/stores/ui-store";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  Command,
} from "@/components/ui/command";
import { navItems } from "./nav-items";
import { contents } from "@/lib/mocks/contents";
import { usersById } from "@/lib/mocks/users";
import {
  Search,
  Plus,
  Upload,
  UserPlus,
  Zap,
  FileText,
  Video,
  Mic,
  Sparkles,
} from "lucide-react";
import { STATUS } from "@/lib/constants";

const typeIcon = { article: FileText, video: Video, audio: Mic, social: Sparkles };

export function CommandPalette() {
  const router = useRouter();
  const open = useUIStore((s) => s.commandPaletteOpen);
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  const recents = contents.slice(0, 6);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Palette de commandes"
      description="Naviguer, rechercher et exécuter des actions"
      className="max-w-2xl border border-white/[0.08] bg-popover/95 backdrop-blur-2xl"
    >
      <Command>
      <CommandInput placeholder="Que voulez-vous faire ? (essayez « contenus », « workflow », un titre…)" />
      <CommandList>
        <CommandEmpty>Aucun résultat — essayez un autre terme.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.href}
                value={`nav ${item.label}`}
                onSelect={() => go(item.href)}
              >
                <Icon className="text-text-secondary" />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span className="ml-auto rounded-full bg-accent-violet/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent-violet">
                    {item.badge}
                  </span>
                )}
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions rapides">
          <CommandItem
            value="action nouveau contenu"
            onSelect={() => go("/dashboard/contenus")}
          >
            <Plus />
            <span>Créer un nouveau contenu</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem value="action upload" onSelect={() => go("/dashboard/medias")}>
            <Upload />
            <span>Uploader un média</span>
          </CommandItem>
          <CommandItem value="action invite" onSelect={() => go("/dashboard/utilisateurs")}>
            <UserPlus />
            <span>Inviter un utilisateur</span>
          </CommandItem>
          <CommandItem
            value="action automation"
            onSelect={() => go("/dashboard/automatisations")}
          >
            <Zap />
            <span>Créer une règle d&apos;automatisation</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Contenus récents">
          {recents.map((c) => {
            const Icon = typeIcon[c.type];
            const author = usersById[c.authorId];
            const status = STATUS[c.status];
            return (
              <CommandItem
                key={c.id}
                value={`content ${c.title} ${author?.name ?? ""}`}
                onSelect={() => go("/dashboard/contenus")}
              >
                <Icon className="text-text-secondary" />
                <span className="truncate">{c.title}</span>
                <span
                  className="ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ color: status.color, background: status.bg }}
                >
                  {status.label}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function CommandPaletteTrigger() {
  const setOpen = useUIStore((s) => s.setCommandPaletteOpen);
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group relative flex h-10 w-full max-w-xl items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] pl-3 pr-2 text-left text-sm text-text-muted transition hover:border-white/[0.14] hover:bg-white/[0.05]"
      aria-label="Ouvrir la palette de commandes"
    >
      <Search size={16} className="text-text-secondary" />
      <span className="flex-1 truncate">
        Rechercher un contenu, un journaliste, une publication…
      </span>
      <kbd className="hidden select-none items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-text-muted sm:inline-flex">
        ⌘K
      </kbd>
    </button>
  );
}
