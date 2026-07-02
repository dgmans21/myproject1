import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface AuthShellProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
  className?: string;
}

export function AuthShell({
  title,
  description,
  backHref = "/",
  backLabel = "홈으로",
  children,
  className,
}: AuthShellProps) {
  return (
    <Card className={cn("w-full max-w-md", className)}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <h1 className="mt-4 text-xl font-bold text-foreground">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-6">{children}</div>
    </Card>
  );
}
