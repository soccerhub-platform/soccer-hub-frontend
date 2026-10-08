import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ChevronDown, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient, getApiErrorMessage } from "../../shared/api";
import { formatPhoneInput, isValidFormattedPhone, normalizePhoneForSubmit } from "../../shared/phone";
import { Button, EmptyState, ErrorState, Input, LoadingState, ModalShell, PageHeader, PageShell, SectionCard, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../shared/ui";
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "../../shared/ui/shadcn/field";
import { Alert, AlertDescription } from "../../shared/ui/shadcn/alert";
import { cn } from "../../shared/ui/utils";

interface Club { clubId: string; name: string; slug: string; email?: string; phoneNumber?: string; address?: string }
interface Branch { branchId: string; clubId: string; name: string; address?: string }
const emptyClub = () => ({ name:"",slug:"",email:"",phone:"",address:"" });
const normalizeSlug = (value: string) => value.toLowerCase().trim().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-");

const ClubsAndBranchesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const clubsQuery = useQuery(["dispatcher","clubs"], () => apiClient.get<{clubs: Club[]}>("/dispatcher/club"));
  const branchesQuery = useQuery(["dispatcher","club-branches"], () => apiClient.get<{branches: Branch[]}>("/dispatcher/branch"));
  const clubs = clubsQuery.data?.clubs || [];
  const branches = branchesQuery.data?.branches || [];
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showClub, setShowClub] = useState(false);
  const [branchClub, setBranchClub] = useState<Club | null>(null);
  const [clubForm, setClubForm] = useState(emptyClub);
  const [slugEdited, setSlugEdited] = useState(false);
  const [branchForm, setBranchForm] = useState({name:"",address:""});
  const [attempted, setAttempted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{type:"club" | "branch"; id:string; name:string} | null>(null);
  const clubErrors = {
    name: clubForm.name.trim() ? "" : "Укажите название клуба",
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clubForm.slug) ? "" : "Используйте латиницу, цифры и дефисы между словами",
    email: !clubForm.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clubForm.email.trim()) ? "" : "Некорректный email",
    phone: !clubForm.phone.trim() || isValidFormattedPhone(clubForm.phone) ? "" : "Введите номер в формате +7 777 123 45 67",
  };
  const refresh = async () => {
    await Promise.all([queryClient.invalidateQueries(["dispatcher","clubs"]),queryClient.invalidateQueries(["dispatcher","club-branches"]),queryClient.invalidateQueries(["dispatcher","branches"])]);
  };
  const openClub = () => { setClubForm(emptyClub()); setSlugEdited(false); setAttempted(false); setError(""); setShowClub(true); };
  const openBranch = (club: Club) => { setBranchForm({name:"",address:""}); setAttempted(false); setError(""); setBranchClub(club); };
  const createClub = async () => {
    if (pending) return;
    setAttempted(true);
    if (Object.values(clubErrors).some(Boolean)) return;
    setPending(true); setError("");
    try {
      await apiClient.post("/dispatcher/club/create",{name:clubForm.name.trim(),slug:clubForm.slug,email:clubForm.email.trim() || undefined,phone:normalizePhoneForSubmit(clubForm.phone) || undefined,address:clubForm.address.trim() || undefined});
      setShowClub(false); toast.success("Клуб создан"); await refresh();
    } catch(reason) { setError(getApiErrorMessage(reason,"Не удалось создать клуб")); }
    finally { setPending(false); }
  };
  const createBranch = async () => {
    if (pending || !branchClub) return;
    setAttempted(true); if (!branchForm.name.trim()) return;
    setPending(true); setError("");
    try {
      await apiClient.post("/dispatcher/branch/create",{clubId:branchClub.clubId,name:branchForm.name.trim(),address:branchForm.address.trim()});
      setExpanded(branchClub.clubId); setBranchClub(null); toast.success("Филиал создан"); await refresh();
    } catch(reason) { setError(getApiErrorMessage(reason,"Не удалось создать филиал")); }
    finally { setPending(false); }
  };
  const remove = async () => {
    if (!deleteTarget || pending) return;
    setPending(true); setError("");
    try {
      await apiClient.delete(`/dispatcher/${deleteTarget.type}/${deleteTarget.id}`);
      if (deleteTarget.type === "club") setExpanded(null);
      setDeleteTarget(null); toast.success("Удалено"); await refresh();
    } catch(reason) { setError(getApiErrorMessage(reason,"Не удалось удалить. Проверьте связанные записи.")); }
    finally { setPending(false); }
  };
  const filtered = clubs.filter(club => `${club.name} ${club.slug} ${club.email || ""} ${branches.filter(b => b.clubId === club.clubId).map(b => b.name).join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <PageShell>
    <PageHeader title="Клубы и филиалы" description="Структура клуба, контакты и рабочие площадки команды." actions={<Button onClick={openClub}><Plus data-icon="inline-start" />Создать клуб</Button>} />
    <SectionCard><FieldGroup><Field><FieldLabel htmlFor="club-search">Поиск</FieldLabel><Input id="club-search" placeholder="Клуб, филиал или email" value={search} onChange={e => setSearch(e.target.value)} /></Field></FieldGroup></SectionCard>
    <SectionCard>
      {clubsQuery.isError ? <ErrorState message="Не удалось загрузить клубы" onRetry={() => void clubsQuery.refetch()} /> : clubsQuery.isLoading ? <LoadingState label="Загрузка клубов…" /> : !clubs.length ? <EmptyState title="Клубов пока нет" description="Создайте клуб, затем добавьте к нему филиалы." action={<Button onClick={openClub}>Создать клуб</Button>} /> : !filtered.length ? <EmptyState title="Ничего не найдено" description="Попробуйте другое название клуба или филиала." action={<Button variant="secondary" onClick={() => setSearch("")}>Сбросить поиск</Button>} /> : <Table>
        <TableHeader><TableRow><TableHead>Клуб</TableHead><TableHead>Контакты</TableHead><TableHead>Филиалы</TableHead><TableHead><span className="sr-only">Действия</span></TableHead></TableRow></TableHeader>
        <TableBody>{filtered.map(club => {
          const clubBranches = branches.filter(branch => branch.clubId === club.clubId);
          const isExpanded = expanded === club.clubId;
          return <React.Fragment key={club.clubId}><TableRow>
            <TableCell><button type="button" className="flex items-center gap-3 text-left" aria-expanded={isExpanded} aria-label={`Филиалы клуба ${club.name}`} onClick={() => setExpanded(isExpanded ? null : club.clubId)}><Building2 className="size-5 shrink-0 text-muted-foreground" /><span><span className="block font-semibold">{club.name}</span><span className="mt-1 block text-xs text-muted-foreground">{club.address || "Адрес не указан"}</span></span><ChevronDown className={cn("size-4 shrink-0 text-muted-foreground",isExpanded && "rotate-180")} /></button></TableCell>
            <TableCell><div className="flex flex-col gap-1 text-xs"><span>{club.phoneNumber || "Телефон не указан"}</span><span className="text-muted-foreground">{club.email || "Email не указан"}</span></div></TableCell>
            <TableCell><StatusBadge>{branchesQuery.isLoading ? "…" : branchesQuery.isError ? "Недоступно" : clubBranches.length}</StatusBadge></TableCell>
            <TableCell><div className="flex justify-end gap-2"><Button size="sm" variant="secondary" onClick={() => openBranch(club)}><Plus data-icon="inline-start" />Филиал</Button><Button size="sm" variant="ghost" onClick={() => { setError(""); setDeleteTarget({type:"club",id:club.clubId,name:club.name}); }}>Удалить</Button></div></TableCell>
          </TableRow>{isExpanded && <TableRow><TableCell colSpan={4}><div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="ui-section-title">Филиалы · {club.name}</h3><Button variant="secondary" size="sm" onClick={() => openBranch(club)}>Добавить филиал</Button></div>
            {branchesQuery.isError ? <ErrorState message="Не удалось загрузить филиалы" onRetry={() => void branchesQuery.refetch()} /> : branchesQuery.isLoading ? <LoadingState label="Загрузка филиалов…" /> : !clubBranches.length ? <EmptyState title="Добавьте первый филиал" description="В нём администраторы будут обрабатывать заявки." /> : clubBranches.map(branch => <div key={branch.branchId} className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><div><div className="text-sm font-medium">{branch.name}</div><div className="mt-1 text-xs text-muted-foreground">{branch.address || "Адрес не указан"}</div></div><Button variant="ghost" size="sm" onClick={() => { setError(""); setDeleteTarget({type:"branch",id:branch.branchId,name:branch.name}); }}>Удалить филиал {branch.name}</Button></div>)}
          </div></TableCell></TableRow>}</React.Fragment>;
        })}</TableBody>
      </Table>}
    </SectionCard>
    {showClub && <ModalShell title="Создать клуб" description="Добавьте название и контакты клуба." placement="right" maxWidthClassName="max-w-[520px]" closeDisabled={pending} onClose={() => setShowClub(false)} footer={<div className="flex justify-between gap-2"><Button variant="secondary" disabled={pending} onClick={() => setShowClub(false)}>Отмена</Button><Button type="submit" form="create-club" disabled={pending}>{pending ? "Создание…" : "Создать"}</Button></div>}>
      <form id="create-club" onSubmit={e => { e.preventDefault(); void createClub(); }}><FieldGroup>
        <Field data-invalid={attempted && Boolean(clubErrors.name)}><FieldLabel htmlFor="club-name">Название *</FieldLabel><Input id="club-name" value={clubForm.name} maxLength={255} disabled={pending} aria-invalid={attempted && Boolean(clubErrors.name)} onChange={e => { const name=e.target.value; setClubForm(value => ({...value,name,slug:slugEdited ? value.slug : normalizeSlug(name)})); }} /><FieldError>{attempted ? clubErrors.name : ""}</FieldError></Field>
        <Field data-invalid={attempted && Boolean(clubErrors.slug)}><FieldLabel htmlFor="club-slug">Код клуба *</FieldLabel><Input id="club-slug" placeholder="my-club" value={clubForm.slug} maxLength={100} disabled={pending} aria-invalid={attempted && Boolean(clubErrors.slug)} onChange={e => { setSlugEdited(true); setClubForm(value => ({...value,slug:normalizeSlug(e.target.value)})); }} /><FieldDescription>Уникальный код: латиница, цифры и дефисы.</FieldDescription><FieldError>{attempted ? clubErrors.slug : ""}</FieldError></Field>
        <Field data-invalid={attempted && Boolean(clubErrors.email)}><FieldLabel htmlFor="club-email">Email</FieldLabel><Input id="club-email" type="email" value={clubForm.email} maxLength={100} disabled={pending} onChange={e => setClubForm(value => ({...value,email:e.target.value}))} /><FieldError>{attempted ? clubErrors.email : ""}</FieldError></Field>
        <Field data-invalid={attempted && Boolean(clubErrors.phone)}><FieldLabel htmlFor="club-phone">Телефон</FieldLabel><Input id="club-phone" type="tel" value={clubForm.phone} maxLength={16} placeholder="+7 777 123 45 67" disabled={pending} onChange={e => setClubForm(value => ({...value,phone:formatPhoneInput(e.target.value)}))} /><FieldError>{attempted ? clubErrors.phone : ""}</FieldError></Field>
        <Field><FieldLabel htmlFor="club-address">Адрес</FieldLabel><Input id="club-address" value={clubForm.address} maxLength={500} disabled={pending} onChange={e => setClubForm(value => ({...value,address:e.target.value}))} /></Field>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      </FieldGroup></form>
    </ModalShell>}
    {branchClub && <ModalShell title="Создать филиал" description={`Клуб: ${branchClub.name}`} placement="right" maxWidthClassName="max-w-[520px]" closeDisabled={pending} onClose={() => setBranchClub(null)} footer={<div className="flex justify-between gap-2"><Button variant="secondary" disabled={pending} onClick={() => setBranchClub(null)}>Отмена</Button><Button type="submit" form="create-branch" disabled={pending}>{pending ? "Создание…" : "Создать"}</Button></div>}>
      <form id="create-branch" onSubmit={e => { e.preventDefault(); void createBranch(); }}><FieldGroup><Field data-invalid={attempted && !branchForm.name.trim()}><FieldLabel htmlFor="branch-name">Название *</FieldLabel><Input id="branch-name" maxLength={255} value={branchForm.name} disabled={pending} aria-invalid={attempted && !branchForm.name.trim()} onChange={e => setBranchForm(value => ({...value,name:e.target.value}))} /><FieldError>{attempted && !branchForm.name.trim() ? "Укажите название филиала" : ""}</FieldError></Field><Field><FieldLabel htmlFor="branch-address">Адрес</FieldLabel><Input id="branch-address" value={branchForm.address} maxLength={500} disabled={pending} onChange={e => setBranchForm(value => ({...value,address:e.target.value}))} /></Field>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}</FieldGroup></form>
    </ModalShell>}
    {deleteTarget && <ModalShell title={deleteTarget.type === "club" ? "Удалить клуб?" : "Удалить филиал?"} description={deleteTarget.name} closeDisabled={pending} maxWidthClassName="max-w-md" onClose={() => setDeleteTarget(null)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={() => setDeleteTarget(null)}>Отмена</Button><Button variant="danger" disabled={pending} onClick={() => void remove()}>{pending ? "Удаление…" : "Удалить"}</Button></div>}><p className="text-sm text-muted-foreground">Удаление нельзя отменить. Если есть связанные записи, сначала завершите работу с ними.</p>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}</ModalShell>}
  </PageShell>;
};
export default ClubsAndBranchesPage;
