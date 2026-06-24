import { forwardRef } from "react";
import type { LucideProps } from "./lucide-props";

/** 12간지 — 양 (Sheep / Goat) */
export const SheepIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M7 16c-2.5-.5-3.5-2.5-2.5-4.5S8 8.5 10 9.5" />
      <path d="M17 16c2.5-.5 3.5-2.5 2.5-4.5S16 8.5 14 9.5" />
      <path d="M8 16h8" />
      <path d="M9.5 16c.5-2 1.5-3 2.5-3s2 1 2.5 3" />
      <path d="M10 11.5h4" />
      <path d="M9.5 12.5v.5" />
      <path d="M14.5 12.5v.5" />
      <path d="M9 9.5c-.5-1-.5-2 0-2.5" />
      <path d="M15 9.5c.5-1 .5-2 0-2.5" />
    </svg>
  )
);

SheepIcon.displayName = "SheepIcon";
