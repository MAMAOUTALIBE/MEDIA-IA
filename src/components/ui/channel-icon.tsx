import type { ChannelKey } from "@/types";
import { CHANNELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Globe, Smartphone, Tv, Send as SendIcon } from "lucide-react";

interface IconProps {
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

function YoutubeGlyph({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M21.6 7.2c-.2-1.2-1-2.2-2.2-2.4C17.4 4.4 12 4.4 12 4.4s-5.4 0-7.4.4C3.4 5 2.6 6 2.4 7.2 2 9.2 2 12 2 12s0 2.8.4 4.8c.2 1.2 1 2.2 2.2 2.4 2 .4 7.4.4 7.4.4s5.4 0 7.4-.4c1.2-.2 2-1.2 2.2-2.4.4-2 .4-4.8.4-4.8s0-2.8-.4-4.8ZM10 15.4V8.6L15.6 12 10 15.4Z" />
    </svg>
  );
}

function FacebookGlyph({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M22 12c0-5.5-4.5-10-10-10S2 6.5 2 12c0 5 3.7 9.1 8.4 9.9V14.9H8v-2.9h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7c4.7-.8 8.4-4.9 8.4-9.9Z" />
    </svg>
  );
}

function InstagramGlyph({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} style={style} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
    </svg>
  );
}

function TwitterGlyph({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.25 2.25h6.83l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function TikTokGlyph({ size = 18, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden>
      <path d="M16.5 3c.55 2.07 1.86 3.45 3.95 3.86v2.83c-1.21 0-2.32-.27-3.41-.79v6.4c0 5.31-5.79 6.96-8.09 3.13-1.48-2.46-.55-6.78 4.27-6.96v3c-.36.06-.74.14-1.13.28-1.13.39-1.77 1.1-1.6 2.36.34 2.42 4.78 3.14 4.41-1.6V3h1.6Z" />
    </svg>
  );
}

const Icons: Record<ChannelKey, React.ComponentType<IconProps>> = {
  web: Globe as React.ComponentType<IconProps>,
  mobile: Smartphone as React.ComponentType<IconProps>,
  youtube: YoutubeGlyph,
  facebook: FacebookGlyph,
  instagram: InstagramGlyph,
  twitter: TwitterGlyph,
  tiktok: TikTokGlyph,
  telegram: SendIcon as React.ComponentType<IconProps>,
  smarttv: Tv as React.ComponentType<IconProps>,
};

export function ChannelIcon({
  channel,
  size = 18,
  decorated = false,
  className,
}: {
  channel: ChannelKey;
  size?: number;
  decorated?: boolean;
  className?: string;
}) {
  const meta = CHANNELS[channel];
  const Icon = Icons[channel];
  if (decorated) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10",
          className,
        )}
        style={{
          width: size + 16,
          height: size + 16,
          color: meta.color,
          background: meta.bg,
        }}
        aria-label={meta.label}
        title={meta.label}
      >
        <Icon size={size} strokeWidth={1.8} />
      </span>
    );
  }
  return (
    <Icon
      size={size}
      strokeWidth={1.8}
      className={className}
      style={{ color: meta.color }}
    />
  );
}
