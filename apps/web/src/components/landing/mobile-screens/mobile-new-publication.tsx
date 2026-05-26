import { Send, ChevronLeft, Image as ImageIcon } from "lucide-react";

export function MobileNewPublication() {
  return (
    <div className="flex h-full flex-col bg-bg-base text-text-primary">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 pt-8 pb-3">
        <ChevronLeft size={16} className="text-text-secondary" />
        <p className="text-xs font-semibold">Nouvelle publication</p>
        <span className="text-[10px] text-text-muted">9:41</span>
      </div>
      <div className="flex-1 space-y-3 p-4 text-[10px]">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-muted">Titre</p>
          <p className="mt-1 rounded-md bg-white/[0.04] p-2 text-[11px] text-text-primary">
            Ouverture du nouveau centre culturel à Dakar
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-muted">Catégorie</p>
          <div className="mt-1 flex items-center justify-between rounded-md bg-white/[0.04] p-2 text-[11px]">
            <span>Culture</span>
            <span className="text-text-muted">▾</span>
          </div>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-muted">Contenu</p>
          <p className="mt-1 rounded-md bg-white/[0.04] p-2 text-[10px] leading-relaxed text-text-secondary">
            Le nouveau centre culturel de Dakar a été officiellement inauguré
            samedi en présence de plusieurs personnalités…
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-muted">Médias ajoutés</p>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded-md bg-gradient-to-br from-accent-blue/25 to-accent-violet/25 text-white"
              >
                <ImageIcon size={12} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-white/[0.05] p-3">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet py-2 text-[11px] font-semibold text-white"
        >
          <Send size={11} />
          Envoyer pour validation
        </button>
      </div>
    </div>
  );
}
