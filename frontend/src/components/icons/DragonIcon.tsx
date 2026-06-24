import { forwardRef } from "react";
import type { LucideProps } from "./lucide-props";

/** 12간지 — 용 (Dragon) · 정면 머리 + 뿔·수염 */
export const DragonIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M8 6 7 3" />
      <path d="M9.5 5 8.5 2" />
      <path d="M16 6 17 3" />
      <path d="M14.5 5 15.5 2" />
      <path d="M12 5c-3 0-5 2-5 5" />
      <path d="M12 5c3 0 5 2 5 5" />
      <path d="M7 10c0 4.5 2 8 5 8.5 3-.5 5-4 5-8.5" />
      <path d="M12 10v6.5" />
      <path d="M9 11.5v1" />
      <path d="M15 11.5v1" />
      <path d="M5.5 11.5H8" />
      <path d="M5 13H8" />
      <path d="M5.5 14.5H8" />
      <path d="M16 11.5h2.5" />
      <path d="M16 13h3" />
      <path d="M16 14.5h2.5" />
      <path d="M10.5 18.5c-.5 1 .5 1.5 1.5 1.5s2-.5 1.5-1.5" />
    </svg>
  )
);

DragonIcon.displayName = "DragonIcon";
