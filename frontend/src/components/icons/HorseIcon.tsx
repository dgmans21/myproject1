import { forwardRef } from "react";
import type { LucideProps } from "./lucide-props";

/** 12간지 — 말 (Horse) · 긴 주둥이 + 갈기 + 역동적 다리 */
export const HorseIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M13.2 4.2V6.8" />
      <path d="M14.8 4.8V7.2" />
      <path d="M4 18.2c-.6-1.8-.2-4 1.3-5.5 1.3-1.3 3.2-2.5 5.2-2.8 1.5-.2 3 .2 4 1.2 1 1 1.5 2.5 1.2 4" />
      <path d="M15.5 8.8c1.2.2 2.5 1 3.2 2.2.8 1.3.8 2.8 0 4.2" />
      <path d="M18.2 11c1.2.5 2.2 1.5 2.5 2.8.3 1.5-.5 3-2 3.8-2.2 1.2-5.5 1.5-9.5 1.2" />
      <path d="M11.2 8.2c-1.2-1.5-2.8-2.5-4.5-2.2" />
      <path d="M12 9.2c-1.5-1-3-1.5-4.5-1.2" />
      <path d="M4 18.2c-1.2-1-1.8-2.8-1.5-4.5" />
      <path d="M7.5 18.2v2.8" />
      <path d="M10.2 18.2v2.8" />
      <path d="M14 17.5v3.5" />
      <path d="M16.8 17v3.5" />
    </svg>
  )
);

HorseIcon.displayName = "HorseIcon";
