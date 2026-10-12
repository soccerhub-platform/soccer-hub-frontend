import { ArrowUpRight, Building2, Mail, MoreHorizontal, Pencil, Phone, ShieldCheck } from "lucide-react";
import { Button, StatusBadge } from "../../../shared/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/ui/shadcn/dropdown-menu";

interface Props {
  name: string;
  role: string;
  email?: string | null;
  phone?: string;
  active: boolean;
  branches: string[];
  manageable?: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onPermissions: () => void;
}

export default function EmployeeCard({ name, role, email, phone, active, branches, manageable = true, onOpen, onEdit, onPermissions }: Props) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
  return <article className="flex min-w-0 flex-col rounded-xl border border-border bg-background transition-colors hover:border-blue-200">
    <div className="flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-semibold text-blue-700" aria-hidden="true">{initials}</span>
      <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold text-foreground"><button type="button" className="text-left hover:text-blue-700 focus-visible:outline-blue-600" onClick={onOpen}>{name.trim() || "Имя не указано"}</button></h3><p className="mt-1 break-words text-xs text-muted-foreground">{role}</p><div className="mt-2"><StatusBadge tone={active ? "success" : "neutral"}>{active ? "Доступ активен" : "Доступ отключён"}</StatusBadge></div></div>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0" aria-label={`Действия с сотрудником ${name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onOpen}><ArrowUpRight />Карточка сотрудника</DropdownMenuItem>
        <DropdownMenuItem disabled={!manageable} onSelect={onEdit}><Pencil />Редактировать</DropdownMenuItem>
        <DropdownMenuItem disabled={!manageable} onSelect={onPermissions}><ShieldCheck />Права доступа</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
    </div>
    <dl className="flex flex-1 flex-col gap-3 px-4 pb-4 text-xs">
      <div className="flex items-center gap-2"><dt className="shrink-0 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="sr-only">Email</span></dt><dd className="min-w-0 break-all">{email ? <a href={`mailto:${email}`} className="text-foreground hover:text-blue-700">{email}</a> : <span className="text-muted-foreground">Email не указан</span>}</dd></div>
      <div className="flex items-center gap-2"><dt className="shrink-0 text-muted-foreground"><Phone className="h-3.5 w-3.5" /><span className="sr-only">Телефон</span></dt><dd className="min-w-0 break-all">{phone ? <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="text-foreground hover:text-blue-700">{phone}</a> : <span className="text-muted-foreground">Телефон не указан</span>}</dd></div>
      <div className="flex items-start gap-2 border-t border-border pt-3"><dt className="shrink-0 text-muted-foreground"><Building2 className="h-4 w-4" /><span className="sr-only">Филиалы</span></dt><dd className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">Филиалы{branches.length ? ` · ${branches.length}` : ""}</span>{branches.length ? <div className="mt-1.5 flex flex-wrap gap-1.5">{branches.map((branch, index) => <span key={`${branch}-${index}`} className="max-w-full break-words rounded-md bg-muted px-2 py-1 text-xs text-foreground">{branch}</span>)}</div> : <span className="mt-1 block text-amber-700">Не назначены</span>}</dd></div>
      {!manageable && <p className="text-[11px] leading-5 text-muted-foreground">Также работает в другой компании. Изменение учётной записи недоступно.</p>}
    </dl>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3"><Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={onOpen}>Подробнее<ArrowUpRight className="h-3.5 w-3.5" /></Button><Button variant="secondary" size="sm" className="h-8 gap-1.5 text-xs" disabled={!manageable} onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Редактировать</Button></div>
  </article>;
}
