import React from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { MetricCard as SharedMetricCard, PageShell as SharedPageShell, SectionCard as SharedSectionCard } from "../ui";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/shadcn/input-group";
import { cn } from "../ui/utils";

export function PageShell({ className, ...props }: React.ComponentProps<typeof SharedPageShell>) {
  return <SharedPageShell {...props} className={cn("min-w-0 max-w-[1540px] gap-3! sm:gap-5!", className)} />;
}

export function SectionCard({ title, description, icon, children, className, bodyClassName, id, flush = false }: React.ComponentProps<typeof SharedSectionCard> & { flush?: boolean }) {
  return <section id={id} className={cn("dispatcher-workspace min-w-0 overflow-hidden rounded-xl border border-border bg-background", className)}>
    {title && <div className="flex items-start gap-2 border-b border-border px-4 py-3">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <div><h2 className="text-xs font-semibold text-foreground">{title}</h2>{description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>}</div>
    </div>}
    <div className={cn(!flush && "p-4", "[&_thead]:bg-muted/30 [&_th]:text-[11px] [&_th]:font-medium [&_th]:normal-case [&_th]:tracking-normal [&_th]:text-muted-foreground [&_td]:py-3 [&_td]:text-xs", bodyClassName)}>{children}</div>
  </section>;
}

export function MetricCard({ title, value, note, delta, tone, loading, onClick, className }: React.ComponentProps<typeof SharedMetricCard>) {
  const content = <><span className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{title}</span>{onClick && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}</span>
    <span className={cn("mt-2 block text-3xl font-semibold tracking-tight tabular-nums", tone === "warning" || tone === "danger" ? "text-destructive" : "text-foreground")}>{loading ? "—" : value}</span>
    {(note || delta) && <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{delta}{delta && note ? " · " : ""}{note}</span>}</>;
  const styles = cn("min-w-0 bg-background p-4 text-left sm:px-5", onClick && "transition hover:bg-muted/30 focus-visible:outline-primary", className);
  return onClick ? <button type="button" onClick={onClick} className={styles}>{content}</button> : <div className={styles}>{content}</div>;
}

export function SearchInput(props: React.ComponentProps<typeof InputGroupInput>) {
  return <InputGroup className="h-9 min-w-[180px] flex-1 sm:max-w-xs"><InputGroupAddon><Search className="h-4 w-4" /></InputGroupAddon><InputGroupInput type="search" {...props} className={cn("text-xs", props.className)} /></InputGroup>;
}

export const toolbarClass = "flex flex-wrap items-center gap-2 border-b border-border px-4 py-3";
export const filtersClass = "flex flex-wrap items-end gap-3 border-b border-border bg-muted/30 p-4 [&_label]:text-[11px] [&_input]:h-9 [&_select]:h-9 [&_input]:text-xs [&_select]:text-xs";
export const paginationClass = "flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-[11px] text-muted-foreground";
