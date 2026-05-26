import { cn } from "@/lib/utils";

export function Logo({
  size = 36,
  withWordmark = false,
  className,
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="CMR — Content Media Room"
      >
        <defs>
          <linearGradient id="cmr-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="55%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
        </defs>
        <rect width="40" height="40" rx="11" fill="url(#cmr-grad)" />
        <path
          d="M14.5 13.5 L25 20 L14.5 26.5 Z"
          fill="white"
          fillOpacity="0.95"
        />
        <circle cx="28" cy="20" r="2.4" fill="white" fillOpacity="0.9" />
      </svg>
      {withWordmark && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-text-primary">CMR</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-text-secondary">
            Content Media Room
          </span>
        </div>
      )}
    </div>
  );
}
