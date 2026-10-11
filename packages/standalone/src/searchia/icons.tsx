import type { FC } from "react";

interface IconProps {
  size?: number | string;
  className?: string;
  color?: string;
}

export const SearchiaLogo: FC<IconProps> = ({ size = 20, className = "" }) => (
  <svg
    width={typeof size === "number" ? size * 4 : size}
    height={size}
    viewBox="0 0 120 30"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Searchia"
    role="img"
  >
    <defs>
      <linearGradient id="searchia-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0052FF" />
        <stop offset="100%" stopColor="#7928CA" />
      </linearGradient>
    </defs>
    {/* Searchia Icon: magnifying glass with sparkle/AI core */}
    <circle
      cx="14"
      cy="14"
      r="8"
      stroke="url(#searchia-grad)"
      strokeWidth="2.5"
      fill="none"
    />
    <path
      d="M20 20L26 26"
      stroke="url(#searchia-grad)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <circle cx="14" cy="14" r="2.5" fill="url(#searchia-grad)" />
    {/* Text: Searchia */}
    <text
      x="34"
      y="21"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      fontSize="17"
      fontWeight="700"
      fill="currentColor"
      letterSpacing="-0.3px"
    >
      Searchia
    </text>
  </svg>
);
