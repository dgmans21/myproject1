import { forwardRef } from "react";
import type { LucideProps } from "./lucide-props";

/** 12간지 — 원숭이 (Monkey) */
export const MonkeyIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ color = "currentColor", size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="7.5" cy="12" r="2.5" />
      <circle cx="16.5" cy="12" r="2.5" />
      <circle cx="12" cy="13.5" r="5" />
      <path d="M10 13v1" />
      <path d="M14 13v1" />
      <path d="M11 16h2" />
      <path d="M16.5 16.5c1.5 1.5 2.5 3.5 2 5.5" />
      <path d="M18 20.5c-.5 1-1.5 1.5-2.5 1" />
    </svg>
  )
);

MonkeyIcon.displayName = "MonkeyIcon";
