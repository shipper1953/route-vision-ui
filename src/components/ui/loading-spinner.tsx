
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  label?: string;
}

interface TigerFistPumpIconProps {
  size: number;
  className?: string;
}

function TigerFistPumpIcon({ size, className }: TigerFistPumpIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Tiger Woods fist pump silhouette"
      focusable="false"
      className={cn("text-emerald-600 drop-shadow-sm", className)}
    >
      <g className="fist-pump-shadow" fill="currentColor" opacity="0.25">
        <ellipse cx="30" cy="58" rx="16" ry="5" />
      </g>
      <g className="fist-pump-animation" fill="currentColor">
        <circle cx="28" cy="14" r="6" />
        <path
          d="M18 58L24 36 18 28 27 21 33 31 41 16 51 20 43 34 43 48 48 58 40 58 36.5 49.5 33 58z"
          fillRule="evenodd"
        />
        <path d="M33 24L48 8 54 14 43 28 43 40 35 40z" />
        <path d="M47 9L61 5 63 11 49 15z" />
        <path d="M21 26L10 34 6 27 19 18z" />
      </g>
    </svg>
  );
}

export function LoadingSpinner({
  className,
  size = 24,
  label = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 text-center",
        className
      )}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="relative">
        <TigerFistPumpIcon size={size} />
      </div>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export { TigerFistPumpIcon };
