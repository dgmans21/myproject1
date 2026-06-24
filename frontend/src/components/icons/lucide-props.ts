import type { RefAttributes, SVGProps } from "react";

/** lucide-react LucideProps와 동일한 커스텀 아이콘 props */
export type LucideProps = SVGProps<SVGSVGElement> &
  RefAttributes<SVGSVGElement> & {
    color?: string;
    size?: string | number;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
  };
