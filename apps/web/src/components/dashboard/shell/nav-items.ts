import {
  LayoutDashboard,
  FileText,
  Image as ImageIcon,
  Radio,
  Calendar,
  GitBranch,
  Zap,
  Send,
  BarChart3,
  Users,
  ScrollText,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";

export interface NavItemDef {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: number;
  badgeLabel?: string;
}

export const navItems: NavItemDef[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dashboard/contenus", label: "Contenus", icon: FileText, badge: 24 },
  { href: "/dashboard/medias", label: "Médias", icon: ImageIcon },
  { href: "/dashboard/live", label: "Live Streaming", icon: Radio, badgeLabel: "LIVE" },
  { href: "/dashboard/calendrier", label: "Calendrier éditorial", icon: Calendar },
  { href: "/dashboard/workflows", label: "Workflows", icon: GitBranch, badge: 6 },
  { href: "/dashboard/automatisations", label: "Automatisations", icon: Zap },
  { href: "/dashboard/diffusion", label: "Diffusion", icon: Send },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/dashboard/audit", label: "Audit & Conformité", icon: ScrollText },
  { href: "/dashboard/parametres", label: "Paramètres", icon: Settings },
];
