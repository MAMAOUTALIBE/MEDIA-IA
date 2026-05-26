"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useMobileStore, STEP_LABEL, STEP_COLOR, type MobileStep } from "@/lib/stores/mobile-store";
import { ChannelIcon } from "@/components/ui/channel-icon";
import { CHANNELS } from "@/lib/constants";
import { formatRelative, formatHour } from "@/lib/format";
import { CheckCircle2, Clock, Send, ArrowRight, FileQuestion } from "lucide-react";
import { toast } from "sonner";

const allSteps: MobileStep[] = ["submitted", "editor", "chief", "direction", "published"];

export default function MobileContentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const submission = useMobileStore((s) => s.submissions.find((x) => x.id === id));
  const advance = useMobileStore((s) => s.advance);

  if (!submission) {
    return (
      <div className="space-y-3 py-8 text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-blue/12 to-accent-violet/10 text-accent-violet ring-1 ring-white/[0.08]">
          <FileQuestion size={22} />
        </span>
        <p className="text-sm font-semibold text-text-primary">Contenu introuvable</p>
        <Link
          href="/mobile/contenus"
          className="inline-block text-xs text-accent-violet underline"
        >
          Retour à mes contenus
        </Link>
      </div>
    );
  }

  const currentIdx = allSteps.indexOf(submission.step);

  function handleAdvance() {
    advance(submission!.id);
    const nextIdx = Math.min(allSteps.length - 1, currentIdx + 1);
    toast.success(`Étape franchie : ${STEP_LABEL[allSteps[nextIdx]!]}`, {
      description: "Notification envoyée à l'équipe.",
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          style={{
            color: STEP_COLOR[submission.step],
            background: `${STEP_COLOR[submission.step]}22`,
          }}
        >
          <Clock size={9} />
          {STEP_LABEL[submission.step]}
        </span>
        <h1 className="mt-2 text-base font-bold leading-tight text-text-primary">
          {submission.title}
        </h1>
        <p className="mt-1 text-[11px] text-text-secondary">
          {submission.category} · soumis {formatRelative(submission.createdAt)}
        </p>
      </div>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Contenu</p>
        <p className="mt-2 text-xs leading-relaxed text-text-primary">{submission.body}</p>
      </section>

      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Canaux cibles
        </p>
        <div className="flex flex-wrap gap-1.5">
          {submission.channels.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-white/[0.06]"
              style={{ background: CHANNELS[c].bg, color: CHANNELS[c].color }}
            >
              <ChannelIcon channel={c} size={10} />
              {CHANNELS[c].label}
            </span>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Pipeline de validation
        </p>
        <ol className="relative space-y-3 pl-5">
          <span className="absolute left-1.5 top-2 h-[calc(100%-2rem)] w-px bg-white/[0.08]" aria-hidden />
          {allSteps.map((step) => {
            const idx = allSteps.indexOf(step);
            const reached = idx <= currentIdx;
            const isCurrent = idx === currentIdx && submission.step !== "published";
            const histEntry = submission.history.find((h) => h.step === step);
            return (
              <li key={step} className="relative">
                <span
                  className={`absolute -left-[14px] top-1 h-3 w-3 rounded-full ring-2 ring-bg-base ${
                    reached
                      ? isCurrent
                        ? "bg-warning animate-pulse"
                        : ""
                      : "bg-white/15"
                  }`}
                  style={reached && !isCurrent ? { background: STEP_COLOR[step] } : undefined}
                  aria-hidden
                />
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs ${
                      reached ? "font-semibold text-text-primary" : "text-text-secondary"
                    }`}
                  >
                    {STEP_LABEL[step]}
                  </p>
                  {histEntry && (
                    <span className="font-mono text-[10px] tabular-nums text-text-muted">
                      {formatHour(histEntry.at)}
                    </span>
                  )}
                  {!histEntry && reached && step === submission.step && (
                    <span className="text-[10px] text-warning">en cours</span>
                  )}
                </div>
                {histEntry && (
                  <p className="text-[11px] text-text-secondary">{histEntry.actor}</p>
                )}
                {reached && !isCurrent && idx < allSteps.length - 1 && (
                  <span className="absolute -left-[12px] top-1.5 z-10">
                    <CheckCircle2 size={9} className="text-white" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {submission.step !== "published" && (
        <button
          type="button"
          onClick={handleAdvance}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet px-4 py-2.5 text-sm font-semibold text-white shadow-glow-violet"
        >
          {submission.step === "submitted" || submission.step === "editor" ? (
            <>
              <Send size={13} />
              Notifier le validateur
            </>
          ) : (
            <>
              <ArrowRight size={13} />
              Simuler l&apos;étape suivante
            </>
          )}
        </button>
      )}
    </div>
  );
}
