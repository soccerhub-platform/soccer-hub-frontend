import { Archive, ArrowUpRight, Clock3, Mail, MapPin, MoreHorizontal, Pencil, Phone, RotateCcw, UserRound } from "lucide-react";
import { Button, StatusBadge } from "../../../shared/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/ui/shadcn/dropdown-menu";
import { DispatcherBranch } from "./branch.types";

interface Props {
  branch: DispatcherBranch;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
}

export default function BranchCard({ branch, onOpen, onEdit, onArchive }: Props) {
  const workingDays = branch.workingHours?.filter(day => !day.closed).length;
  return <article className="flex min-w-0 flex-col rounded-xl border border-border bg-background transition-colors hover:border-blue-200">
    <div className="flex items-start justify-between gap-3 p-4 pb-3">
      <div className="min-w-0">
        <StatusBadge tone={branch.active ? "success" : "neutral"}>{branch.active ? "Активный" : "Архив"}</StatusBadge>
        <h3 className="mt-2 break-words text-sm font-semibold text-foreground"><button type="button" onClick={onOpen} className="text-left hover:text-blue-700 focus-visible:outline-blue-600">{branch.name}</button></h3>
      </div>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" aria-label={`Действия с филиалом ${branch.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpen}><ArrowUpRight />Карточка и история</DropdownMenuItem>
          {branch.active && <DropdownMenuItem onSelect={onEdit}><Pencil />Редактировать</DropdownMenuItem>}
          <DropdownMenuItem onSelect={onArchive}>{branch.active ? <Archive /> : <RotateCcw />}{branch.active ? "Архивировать" : "Восстановить"}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <dl className="flex flex-1 flex-col gap-3 px-4 pb-4 text-xs">
      <div className="flex items-start gap-2"><dt className="shrink-0 text-muted-foreground"><MapPin className="h-4 w-4" /><span className="sr-only">Адрес</span></dt><dd className="break-words leading-5 text-muted-foreground">{branch.address || "Адрес не указан"}</dd></div>
      <div className="flex items-start gap-2"><dt className="shrink-0 text-muted-foreground"><UserRound className="h-4 w-4" /><span className="sr-only">Руководитель</span></dt><dd className="min-w-0"><span className="block text-[11px] text-muted-foreground">Руководитель филиала</span><span className={`mt-0.5 block break-words font-medium ${!branch.managerAdminId && branch.active ? "text-amber-700" : "text-foreground"}`}>{branch.managerName || (branch.managerAdminId ? "Назначен" : "Не назначен")}</span></dd></div>
      <div className="flex items-center gap-2 text-muted-foreground"><dt className="shrink-0"><Clock3 className="h-4 w-4" /><span className="sr-only">График</span></dt><dd>{branch.workingHours?.length ? workingDays ? `Рабочих дней в неделю: ${workingDays}` : "Все дни — выходные" : "График не указан"}</dd></div>
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2"><dt className="shrink-0 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span className="sr-only">Телефон</span></dt><dd className="min-w-0 break-all">{branch.phone ? <a href={`tel:${branch.phone.replace(/[^+\d]/g, "")}`} className="text-foreground hover:text-blue-700">{branch.phone}</a> : <span className="text-muted-foreground">Телефон не указан</span>}</dd></div>
        <div className="flex items-center gap-2"><dt className="shrink-0 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="sr-only">Email</span></dt><dd className="min-w-0 break-all">{branch.email ? <a href={`mailto:${branch.email}`} className="text-foreground hover:text-blue-700">{branch.email}</a> : <span className="text-muted-foreground">Email не указан</span>}</dd></div>
      </div>
    </dl>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
      <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onOpen}>Подробнее<ArrowUpRight className="h-3.5 w-3.5" /></Button>
      <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" onClick={branch.active ? onEdit : onArchive}>{branch.active ? <Pencil className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}{branch.active ? "Редактировать" : "Восстановить"}</Button>
    </div>
  </article>;
}
