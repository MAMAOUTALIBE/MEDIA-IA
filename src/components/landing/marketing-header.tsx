import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";

const links = [
  { href: "#solution", label: "Solution" },
  { href: "#workflow", label: "Workflow" },
  { href: "#ia", label: "Vérifications IA" },
  { href: "#diffusion", label: "Diffusion" },
  { href: "#kpi", label: "Résultats" },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.04] bg-bg-base/70 backdrop-blur-2xl">
      <Container className="flex h-16 items-center justify-between">
        <Logo size={32} withWordmark />
        <nav className="hidden items-center gap-7 text-sm text-text-secondary md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="transition hover:text-text-primary">
              {l.label}
            </a>
          ))}
        </nav>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2 text-sm font-semibold text-white shadow-glow-violet transition hover:opacity-95"
        >
          Accéder au dashboard
          <ArrowRight size={14} />
        </Link>
      </Container>
    </header>
  );
}
