import { TrustBadge } from "@/components/ProfileBadgeBorder";

interface SocialPointBadgeProps {
  title: string;
  badgeColor?: string;
  className?: string;
}

export function SocialPointBadge({ title, badgeColor, className }: SocialPointBadgeProps) {
  return <TrustBadge title={title} badgeColor={badgeColor} className={className} />;
}
