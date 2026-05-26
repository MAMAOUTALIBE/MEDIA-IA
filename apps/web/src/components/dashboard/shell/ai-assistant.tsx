"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Bot, Send, Sparkles, X, ArrowRight } from "lucide-react";
import { ask, summary, SUGGESTED_PROMPTS, SLASH_COMMANDS, type AIAnswer } from "@/lib/ai-engine";
import { navItems } from "@/components/dashboard/shell/nav-items";
import { API_URL } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "intro";
  content?: string;
  answer?: AIAnswer;
  ts: number;
}

const introMessage: ChatMessage = {
  id: "intro",
  role: "intro",
  ts: 0,
};

export function AIAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([introMessage]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSlashMenu = input.startsWith("/");
  const slashMatches = showSlashMenu
    ? SLASH_COMMANDS.filter((c) =>
        c.command.toLowerCase().startsWith(input.split(" ")[0]!.toLowerCase()),
      )
    : [];
  const gotoMatches =
    input.toLowerCase().startsWith("/goto ")
      ? navItems.filter((n) =>
          n.label.toLowerCase().includes(input.slice(6).toLowerCase().trim()),
        )
      : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  function pushAssistant(answer: AIAnswer) {
    setMessages((prev) => [
      ...prev,
      {
        id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: "assistant",
        answer,
        ts: Date.now(),
      },
    ]);
  }

  function handleSlash(raw: string): boolean {
    const [cmd, ...rest] = raw.trim().split(/\s+/);
    const arg = rest.join(" ").trim();
    switch (cmd) {
      case "/clear":
        setMessages([introMessage]);
        toast.success("Conversation effacée");
        return true;
      case "/help":
        pushAssistant({
          reply: "**Commandes disponibles** :",
          bullets: SLASH_COMMANDS.map(
            (c) => `\`${c.command}${c.argHint ? " " + c.argHint : ""}\` — ${c.description}`,
          ),
        });
        return true;
      case "/export": {
        const md = messages
          .filter((m) => m.role !== "intro")
          .map((m) =>
            m.role === "user"
              ? `**Vous** : ${m.content}`
              : `**CMR Assistant** : ${m.answer?.reply ?? ""}${
                  m.answer?.bullets ? "\n" + m.answer.bullets.map((b) => `- ${b}`).join("\n") : ""
                }`,
          )
          .join("\n\n");
        toast.success("Conversation exportée", {
          description: `${md.split("\n").length} lignes au format Markdown (mock).`,
        });
        return true;
      }
      case "/summary":
        pushAssistant(summary());
        return true;
      case "/goto": {
        const target = navItems.find((n) =>
          n.label.toLowerCase().includes(arg.toLowerCase()),
        );
        if (!target) {
          pushAssistant({
            reply: `Aucune page ne correspond à « ${arg || "(vide)"} ».`,
            bullets: navItems.map((n) => `${n.label}`),
          });
          return true;
        }
        toast.success(`Navigation vers ${target.label}`);
        setOpen(false);
        router.push(target.href);
        return true;
      }
      default:
        pushAssistant({
          reply: `Commande inconnue : \`${cmd}\`. Tapez \`/help\` pour la liste.`,
        });
        return true;
    }
  }

  async function streamFromApi(question: string): Promise<boolean> {
    if (!API_URL) return false;
    try {
      const res = await fetch(`${API_URL.replace(/\/$/, "")}/ai/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok || !res.body) return false;

      // Push an empty assistant message we'll fill progressively
      const streamingId = `a-stream-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: streamingId, role: "assistant", answer: { reply: "" }, ts: Date.now() },
      ]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let aggregate = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const evt of events) {
          // Parse "event: chunk\ndata: {...}"
          const eventLine = evt.split("\n").find((l) => l.startsWith("event:"));
          const dataLine = evt.split("\n").find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const type = eventLine.slice(6).trim();
          if (type === "chunk") {
            try {
              const payload = JSON.parse(dataLine.slice(5).trim());
              aggregate += payload.text ?? "";
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamingId
                    ? { ...m, answer: { reply: aggregate } }
                    : m,
                ),
              );
            } catch {
              /* skip malformed chunk */
            }
          } else if (type === "done") {
            return true;
          } else if (type === "error") {
            return false;
          }
        }
      }
      return true;
    } catch (err) {
      console.warn("[ai] stream failed, falling back to local", err);
      return false;
    }
  }

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setInput("");
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: q, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    if (q.startsWith("/")) {
      setTimeout(() => handleSlash(q), 120);
      return;
    }

    setTyping(true);

    // Try API streaming first; fall back to local heuristic if unavailable
    (async () => {
      const streamed = await streamFromApi(q);
      if (!streamed) {
        // Local fallback with simulated thinking delay
        const delay = 450 + Math.min(800, q.length * 12);
        await new Promise((r) => setTimeout(r, delay));
        pushAssistant(ask(q));
      }
      setTyping(false);
    })();
  }

  function pickSlash(cmd: string) {
    setInput(cmd + (SLASH_COMMANDS.find((c) => c.command === cmd)?.argHint ? " " : ""));
    inputRef.current?.focus();
  }

  function pickGoto(label: string) {
    setInput("/goto " + label.toLowerCase());
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-blue via-accent-violet to-pink-500 text-white shadow-glow-violet ring-1 ring-white/20 transition hover:scale-105 hover:shadow-elevated"
        aria-label="Ouvrir l'assistant IA"
      >
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-accent-blue via-accent-violet to-pink-500 opacity-50 blur-xl"
        />
        <Bot size={22} />
        <span className="absolute -top-1 -right-1 inline-flex h-3.5 w-3.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-success ring-2 ring-bg-base" />
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="!w-full !max-w-md flex flex-col border-l border-white/[0.08] bg-bg-card/95 p-0 backdrop-blur-2xl"
          showCloseButton={false}
        >
          <SheetHeader className="!gap-1 border-b border-white/[0.06] !p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent-blue via-accent-violet to-pink-500 text-white shadow-glow-violet ring-1 ring-white/20"
                  aria-hidden
                >
                  <Bot size={18} />
                </span>
                <div>
                  <SheetTitle className="!text-base !font-bold !text-text-primary">
                    Assistant CMR
                  </SheetTitle>
                  <SheetDescription className="!mt-0 !text-[11px] !text-text-secondary">
                    GPT-4 · Whisper · contexte temps réel
                  </SheetDescription>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition hover:bg-white/[0.06] hover:text-text-primary"
                aria-label="Fermer"
              >
                <X size={14} />
              </button>
            </div>
          </SheetHeader>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
          >
            {messages.map((m) =>
              m.role === "intro" ? <IntroBlock key={m.id} onPick={(p) => send(p)} /> : <MessageBubble key={m.id} message={m} />,
            )}
            {typing && (
              <div className="flex items-start gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-violet/30 text-accent-violet">
                  <Bot size={12} />
                </span>
                <div className="flex h-7 items-center gap-1 rounded-2xl rounded-tl-md bg-white/[0.04] px-3 ring-1 ring-white/[0.06]">
                  <Dot delay={0} />
                  <Dot delay={120} />
                  <Dot delay={240} />
                </div>
              </div>
            )}
          </div>

          {showSlashMenu && (slashMatches.length > 0 || gotoMatches.length > 0) && (
            <div className="mx-3 mb-1 overflow-hidden rounded-xl border border-white/[0.10] bg-popover/95 backdrop-blur-xl">
              {gotoMatches.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto py-1">
                  <li className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    /goto — pages
                  </li>
                  {gotoMatches.map((n) => {
                    const NavIcon = n.icon;
                    return (
                      <li key={n.href}>
                        <button
                          type="button"
                          onClick={() => pickGoto(n.label)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-text-primary transition hover:bg-white/[0.05]"
                        >
                          <NavIcon size={12} className="text-text-secondary" />
                          <span className="flex-1 text-left">{n.label}</span>
                          <ArrowRight size={10} className="text-text-muted" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ul className="max-h-64 overflow-y-auto py-1">
                  <li className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Commandes
                  </li>
                  {slashMatches.map((c) => (
                    <li key={c.command}>
                      <button
                        type="button"
                        onClick={() => pickSlash(c.command)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs transition hover:bg-white/[0.05]"
                      >
                        <span className="font-mono font-semibold text-accent-violet">
                          {c.command}
                          {c.argHint && (
                            <span className="ml-1 text-text-muted">{c.argHint}</span>
                          )}
                        </span>
                        <span className="ml-auto truncate text-right text-[11px] text-text-secondary">
                          {c.description}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-white/[0.06] p-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez une question ou tapez / pour les commandes"
              className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-violet/40 focus:outline-none focus:ring-2 focus:ring-accent-violet/20"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-accent-blue to-accent-violet text-white transition hover:opacity-95 disabled:opacity-40"
              aria-label="Envoyer"
            >
              <Send size={14} />
            </button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-text-secondary"
      style={{ animation: `cmr-typing 1.2s ${delay}ms infinite ease-in-out` }}
    >
      <style>{`@keyframes cmr-typing{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-3px);opacity:1}}`}</style>
    </span>
  );
}

function IntroBlock({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-violet/30 text-accent-violet">
          <Bot size={12} />
        </span>
        <div className="rounded-2xl rounded-tl-md bg-white/[0.04] px-4 py-3 text-sm text-text-primary ring-1 ring-white/[0.06]">
          Bonjour 👋 Je peux interroger votre dashboard en temps réel : contenus en
          attente, audience, alertes, workflows, score IA, plateformes, équipe…
          <p className="mt-1.5 text-[11px] text-text-secondary">
            Cliquez une suggestion ou tapez votre question.
          </p>
        </div>
      </div>
      <div>
        <p className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          <Sparkles size={10} className="text-accent-violet" />
          Suggestions
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPick(p)}
              className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3 py-1.5 text-left text-xs text-text-secondary transition hover:border-accent-violet/40 hover:bg-accent-violet/10 hover:text-text-primary"
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-accent-blue/20 to-accent-violet/20 px-4 py-2 text-sm text-text-primary ring-1 ring-accent-violet/20">
          {message.content}
        </div>
      </div>
    );
  }
  const a = message.answer!;
  return (
    <div className="flex items-start gap-2">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-blue/30 to-accent-violet/30 text-accent-violet">
        <Bot size={12} />
      </span>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-white/[0.04] px-4 py-3 text-sm text-text-primary ring-1 ring-white/[0.06]">
        <RichText text={a.reply} />
        {a.bullets && a.bullets.length > 0 && (
          <ul className="mt-2 space-y-1 text-[13px] text-text-secondary">
            {a.bullets.map((b, i) => (
              <li key={i} className={cn("flex gap-1.5", b.startsWith("•") ? "pl-0" : "")}>
                {!b.startsWith("•") && (
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-violet" />
                )}
                <span><RichText text={b.replace(/^•\s*/, "")} /></span>
              </li>
            ))}
          </ul>
        )}
        {a.citations && a.citations.length > 0 && (
          <p className="mt-2 text-[10px] text-text-muted">
            Sources : {a.citations.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-text-primary">
              {p.slice(2, -2)}
            </strong>
          );
        }
        if (p.startsWith("*") && p.endsWith("*")) {
          return (
            <em key={i} className="italic text-text-secondary">
              {p.slice(1, -1)}
            </em>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
