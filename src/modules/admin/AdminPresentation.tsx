import React from "react";
import { ArrowUpRight } from "lucide-react";
import * as UI from "../../shared/ui";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../shared/ui/shadcn/Card";
import { cn } from "../../shared/ui/utils";
import "./admin-workspace.css";

/** Common presentation for branch administration; data and actions stay in each page. */
export function PageShell({ className, ...props }: React.ComponentProps<typeof UI.PageShell>) {
  return <UI.PageShell {...props} className={cn("admin-workspace min-w-0 max-w-[1540px] gap-4 sm:gap-5", className)} />;
}
export function PageHeader({ className, ...props }: React.ComponentProps<typeof UI.PageHeader>) {
  return <UI.PageHeader {...props} className={cn("admin-page-header", className)} />;
}
export function SectionCard({ title, description, icon, children, id, className, bodyClassName, flush = false }: React.ComponentProps<typeof UI.SectionCard> & { flush?: boolean }) {
  const surfaceClass = className?.split(" ").filter(token => !/^p-[0-9]+$/.test(token)).join(" ");
  const edgeToEdge = flush || (className?.split(" ").includes("p-0") && !bodyClassName);
  return <Card id={id} className={cn("admin-section min-w-0 overflow-hidden rounded-xl border-border bg-background", surfaceClass)}>
    {title && <CardHeader className="flex flex-row items-start gap-2 border-b border-border p-4">
      {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      <div className="min-w-0"><CardTitle className="text-sm">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</div>
    </CardHeader>}
    <CardContent className={cn(edgeToEdge ? "p-0" : "p-4", bodyClassName)}>{children}</CardContent>
  </Card>;
}
export function SummaryStrip({ children, columns = 4, label = "Сводка", description }: { children: React.ReactNode; columns?: number; label?: string; description?: string }) {
  return <section className="admin-summary" aria-label={label}>
    <div className="admin-summary-heading"><h2>{label}</h2>{description && <p>{description}</p>}</div>
    <div className="admin-summary-grid" style={{ "--summary-columns": columns } as React.CSSProperties}>{children}</div>
  </section>;
}
export function MetricCard({ title, value, note, delta, tone, loading, onClick, progress, className, variant }: React.ComponentProps<typeof UI.MetricCard>) {
  const content = <><span className="admin-metric-label">{title}{onClick && <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />}</span>
    <span className="admin-metric-value" data-attention={(tone === "danger" || tone === "warning") && (typeof value !== "number" || value > 0)}>{loading ? "—" : value}</span>
    {(note || delta) && <span className="admin-metric-note">{delta}{delta && note ? " · " : ""}{note}</span>}
    {progress !== undefined && <span className="admin-metric-progress" role="meter" aria-label={typeof title === "string" ? title : "Прогресс"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0, Math.min(100, progress))}><span style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></span>}</>;
  const styles = cn("admin-metric", variant === "compact" && "admin-metric-compact", className);
  return onClick ? <button type="button" className={styles} onClick={onClick}>{content}</button> : <div className={styles}>{content}</div>;
}
export function WorkspaceMetric({ label, ...props }: React.ComponentProps<typeof UI.WorkspaceMetric>) {
  return <MetricCard {...props} title={label} />;
}
export function WorkspaceHeader({ className, ...props }: React.ComponentProps<typeof UI.WorkspaceHeader>) {
  return <UI.WorkspaceHeader {...props} className={cn("admin-entity-header rounded-xl border-border p-4 sm:p-5", className)} />;
}
export function WorkspaceTabs({ className, ...props }: React.ComponentProps<typeof UI.WorkspaceTabs>) {
  return <UI.WorkspaceTabs {...props} className={cn("admin-workspace-tabs bg-transparent", className)} />;
}
export function FilterBar({ className, ...props }: React.ComponentProps<typeof UI.FilterBar>) {
  return <UI.FilterBar {...props} className={cn("admin-toolbar rounded-none border-0 border-b border-border p-4", className)} />;
}
export function Registry({ children, label }: { children: React.ReactNode; label: string }) {
  return <section className="admin-register" aria-label={label}>{children}</section>;
}
