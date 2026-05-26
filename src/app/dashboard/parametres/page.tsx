"use client";

import { useState } from "react";
import { GlassCard, GlassCardHeader } from "@/components/ui/glass-card";
import { Switch } from "@/components/ui/switch";
import { currentUser } from "@/lib/mocks/users";
import { ROLES } from "@/lib/constants";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import {
  UserRound,
  Users as UsersIcon,
  Plug,
  ShieldCheck,
  Bell,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "profile" | "team" | "integrations" | "security" | "notifications" | "billing";

const tabs: { key: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "profile", label: "Mon profil", icon: UserRound },
  { key: "team", label: "Équipe", icon: UsersIcon },
  { key: "integrations", label: "Intégrations", icon: Plug },
  { key: "security", label: "Sécurité", icon: ShieldCheck },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "billing", label: "Facturation", icon: CreditCard },
];

export default function ParametresPage() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Paramètres</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Profil, équipe, intégrations, sécurité, notifications, facturation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="space-y-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-gradient-to-r from-accent-blue/[0.12] via-accent-violet/[0.10] to-transparent text-text-primary"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
                )}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </nav>

        <div className="space-y-4">
          {tab === "profile" && (
            <GlassCard>
              <GlassCardHeader title="Mon profil" description="Informations publiques visibles par votre équipe" />
              <div className="space-y-5 p-5">
                <div className="flex items-center gap-4">
                  <InitialsAvatar initials={currentUser.initials} color={currentUser.color} size={72} />
                  <div>
                    <p className="text-lg font-semibold text-text-primary">{currentUser.name}</p>
                    <p className="text-sm text-text-secondary">{currentUser.email}</p>
                    <span
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: ROLES[currentUser.role].color,
                        background: `${ROLES[currentUser.role].color}1f`,
                      }}
                    >
                      {ROLES[currentUser.role].label}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Nom complet" value={currentUser.name} />
                  <Field label="Email professionnel" value={currentUser.email} />
                  <Field label="Équipe" value={currentUser.team} />
                  <Field label="Téléphone" value="+221 33 123 45 67" />
                </div>
              </div>
            </GlassCard>
          )}

          {tab === "team" && (
            <GlassCard>
              <GlassCardHeader title="Équipe" description="12 membres répartis sur 6 rôles" />
              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
                {(Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => (
                  <div
                    key={r}
                    className="flex items-center justify-between rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{ROLES[r].label}</p>
                      <p className="text-[11px] text-text-secondary">2 utilisateurs</p>
                    </div>
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: ROLES[r].color }}
                    />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {tab === "integrations" && (
            <GlassCard>
              <GlassCardHeader title="Intégrations" description="Connecteurs externes activés sur la plateforme" />
              <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2">
                {[
                  ["YouTube Studio", "API officielle", true],
                  ["Meta Business", "Facebook + Instagram", true],
                  ["X / Twitter API", "v2 OAuth", true],
                  ["TikTok for Business", "API Content Posting", true],
                  ["Telegram Bot API", "Canaux officiels", true],
                  ["n8n", "Workflows automatisés", true],
                  ["Camunda BPMN", "Moteur de processus", true],
                  ["Whisper", "Transcription IA", true],
                ].map(([name, desc, active]) => (
                  <div
                    key={name as string}
                    className="flex items-center justify-between rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{name as string}</p>
                      <p className="text-[11px] text-text-secondary">{desc as string}</p>
                    </div>
                    <Switch defaultChecked={active as boolean} />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {tab === "security" && (
            <GlassCard>
              <GlassCardHeader title="Sécurité" description="Authentification et politiques d'accès" />
              <div className="space-y-3 p-5">
                {[
                  ["Authentification à deux facteurs", "Code TOTP via app mobile", true],
                  ["Session unique par appareil", "Déconnexion automatique des sessions concurrentes", false],
                  ["Connexion par SSO Entreprise", "SAML 2.0 — Okta / Azure AD", true],
                  ["Journal d'audit complet", "Conservation 365 jours", true],
                  ["Chiffrement des médias au repos", "AES-256 sur l'ensemble du DAM", true],
                ].map(([label, desc, on]) => (
                  <div
                    key={label as string}
                    className="flex items-center justify-between rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{label as string}</p>
                      <p className="text-[11px] text-text-secondary">{desc as string}</p>
                    </div>
                    <Switch defaultChecked={on as boolean} />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {tab === "notifications" && (
            <GlassCard>
              <GlassCardHeader title="Notifications" description="Canaux de notification pour cet utilisateur" />
              <div className="space-y-3 p-5">
                {[
                  ["Contenus en attente de validation", "Email + push", true],
                  ["Échec d'une vérification IA", "Push immédiat", true],
                  ["Workflows en retard (> 2h)", "Email", true],
                  ["Publication automatique réussie", "Push silencieux", false],
                  ["Rapport quotidien", "Email à 8h", true],
                ].map(([label, desc, on]) => (
                  <div
                    key={label as string}
                    className="flex items-center justify-between rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/[0.06]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{label as string}</p>
                      <p className="text-[11px] text-text-secondary">{desc as string}</p>
                    </div>
                    <Switch defaultChecked={on as boolean} />
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {tab === "billing" && (
            <GlassCard>
              <GlassCardHeader title="Facturation" description="Plan et utilisation du compte CMR" />
              <div className="space-y-5 p-5">
                <div className="rounded-xl bg-gradient-to-br from-accent-blue/15 to-accent-violet/15 p-5 ring-1 ring-white/10">
                  <p className="text-xs uppercase tracking-wider text-accent-violet">Plan actuel</p>
                  <p className="mt-1 text-xl font-bold text-text-primary">Enterprise National</p>
                  <p className="mt-1 text-xs text-text-secondary">Facturation annuelle · prochain renouvellement le 01/09/2026</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Field label="Utilisateurs" value="12 / 50" />
                  <Field label="Stockage DAM" value="1.4 To / 5 To" />
                  <Field label="Workflows actifs" value="142 / 500" />
                  <Field label="Publications mensuelles" value="3 287 / illimité" />
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.025] p-3 ring-1 ring-white/[0.06]">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}
