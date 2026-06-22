import { Card } from "@/components/ui/shadcn/card";
import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning" | "destructive";
}) {
  const accentCls = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success-400",
    warning: "bg-warning/15 text-warning-400",
    destructive: "bg-destructive/15 text-danger-300",
  }[accent];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</div>
          {sub ? <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div> : null}
        </div>
        {Icon ? (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", accentCls)}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
