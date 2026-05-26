import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.04] bg-bg-base py-10">
      <Container>
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-3">
            <Logo size={32} withWordmark />
          </div>
          <p className="text-center text-xs text-text-muted md:text-right">
            © {new Date().getFullYear()} CMR — Content Media Room. Plateforme
            propulsée par l&apos;IA et l&apos;automatisation. Tous droits réservés.
          </p>
        </div>
      </Container>
    </footer>
  );
}
