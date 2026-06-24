import { forwardRef } from "react";
import type { LucideProps } from "./lucide-props";

/** 12간지 — 소 (Ox) · 정면 얼굴 + 뿔 */
export const OxIcon = forwardRef<SVGSVGElement, LucideProps>(
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
      <path d="M8 6c-1-2.5.5-3.5 2-2" />
      <path d="M16 6c1-2.5-.5-3.5-2-2" />
      <path d="M12 19c-4.5 0-6.5-3.5-6.5-7s2.5-6 6.5-6 6.5 2.5 6.5 6-2 7-6.5 7z" />
      <path d="M9 12.5v1" />
      <path d="M15 12.5v1" />
      <path d="M9.5 15.5h5" />
      <path d="M10.5 17v.5" />
      <path d="M13.5 17v.5" />
    </svg>
  )
);

OxIcon.displayName = "OxIcon";
