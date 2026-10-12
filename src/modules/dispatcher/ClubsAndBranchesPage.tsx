import { SearchInput, toolbarClass, MetricCard, PageShell, SectionCard } from "./ui/DispatcherPresentation";
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MoreHorizontal, Plus, RefreshCw, Trash2, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient, getApiErrorMessage } from "../../shared/api";
import { formatPhoneInput, isValidFormattedPhone, normalizePhoneForSubmit } from "../../shared/phone";
import { Button, EmptyState, ErrorState, Input, LoadingState, ModalShell, PageHeader } from "../../shared/ui";
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "../../shared/ui/shadcn/field";
import { Alert, AlertDescription } from "../../shared/ui/shadcn/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../shared/ui/shadcn/dropdown-menu";
import BranchCard from "./branches/BranchCard";
import { ToggleGroup, ToggleGroupItem } from "../../shared/ui/shadcn/toggle-group";
import BranchEditor from "./branches/BranchEditor";
import BranchDetails from "./branches/BranchDetails";
import { BranchManagementApi } from "./branches/branch.api";
import { DispatcherBranch } from "./branches/branch.types";

import { useDispatcherScope } from "./company/DispatcherScope";

interface Club { clubId: string; name: string; slug: string; email?: string; phoneNumber?: string; address?: string }
const emptyClub = () => ({ name:"",slug:"",email:"",phone:"",address:"" });
const normalizeSlug = (value: string) => value.toLowerCase().trim().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"").replace(/-+/g,"-");

const ClubsAndBranchesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { branchId: scopeBranchId } = useDispatcherScope();
  const clubsQuery = useQuery(["dispatcher","clubs"], () => apiClient.get<{clubs: Club[]}>("/dispatcher/club"));
  const branchesQuery = useQuery(["dispatcher","club-branches"], BranchManagementApi.list);
  const clubs = (clubsQuery.data?.clubs || []).filter(club => !scopeBranchId || branchesQuery.data?.branches.some(branch => branch.branchId === scopeBranchId && branch.clubId === club.clubId));
  const branches = branchesQuery.data?.branches || [];
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);
  const [search, setSearch] = useState("");
  const [showClub, setShowClub] = useState(false);
  const [branchClub, setBranchClub] = useState<Club | null>(null);
  const [clubForm, setClubForm] = useState(emptyClub);
  const [slugEdited, setSlugEdited] = useState(false);
  const [editingBranch, setEditingBranch] = useState<DispatcherBranch | undefined>();
  const [previewBranch, setPreviewBranch] = useState<DispatcherBranch | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<DispatcherBranch | null>(null);
  const [branchFilter, setBranchFilter] = useState("active");
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
    await Promise.all([queryClient.invalidateQueries(["dispatcher","clubs"]),queryClient.invalidateQueries(["dispatcher","club-branches"]),queryClient.invalidateQueries(["dispatcher","branches"]),queryClient.invalidateQueries(["dispatcher","branch-managers"])]);
  };
  const openClub = () => { setClubForm(emptyClub()); setSlugEdited(false); setAttempted(false); setError(""); setShowClub(true); };
  const openBranch = (club: Club, branch?: DispatcherBranch) => { setEditingBranch(branch); setError(""); setBranchClub(club); };
  const closeBranch = () => { setBranchClub(null); setEditingBranch(undefined); };
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
  const changeArchive = async () => {
    if (!archiveTarget || pending) return;
    setPending(true); setError("");
    try {
      if (archiveTarget.active) await BranchManagementApi.archive(archiveTarget.branchId);
      else await BranchManagementApi.restore(archiveTarget.branchId);
      toast.success(archiveTarget.active ? "Филиал в архиве" : "Филиал восстановлен");
      setArchiveTarget(null); setPreviewBranch(null); await refresh();
    } catch (reason) { setError(getApiErrorMessage(reason, "Не удалось изменить статус филиала")); }
    finally { setPending(false); }
  };
  const scopedBranches = branches.filter(branch => !scopeBranchId || branch.branchId === scopeBranchId);
  const visibleBranches = scopedBranches.filter(branch => (scopeBranchId || branchFilter === "all" || (branchFilter === "active" ? branch.active : !branch.active)) && (!onlyUnassigned || (branch.active && !branch.managerAdminId)));
  const query = search.trim().toLowerCase();
  const matchesClub = (club: Club) => `${club.name} ${club.slug} ${club.email || ""} ${club.phoneNumber || ""} ${club.address || ""}`.toLowerCase().includes(query);
  const matchesBranch = (branch: DispatcherBranch) => `${branch.name} ${branch.address || ""} ${branch.email || ""} ${branch.phone || ""} ${branch.managerName || ""}`.toLowerCase().includes(query);
  const remove = async () => {
    if (!deleteTarget || pending) return;
    setPending(true); setError("");
    try {
      await apiClient.delete(`/dispatcher/${deleteTarget.type}/${deleteTarget.id}`);
      setDeleteTarget(null); toast.success("Удалено"); await refresh();
    } catch(reason) { setError(getApiErrorMessage(reason,"Не удалось удалить. Проверьте связанные записи.")); }
    finally { setPending(false); }
  };
  const filtered = clubs.filter(club => {
    const clubBranches = visibleBranches.filter(branch => branch.clubId === club.clubId);
    return ((!onlyUnassigned && (scopeBranchId || branchFilter !== "archived")) || clubBranches.length > 0)
      && (matchesClub(club) || clubBranches.some(matchesBranch));
  });
  const dataLoading = clubsQuery.isLoading || branchesQuery.isLoading;
  const dataError = clubsQuery.isError || branchesQuery.isError;
  const foundBranches = visibleBranches.filter(branch => filtered.some(club => club.clubId === branch.clubId && (matchesClub(club) || matchesBranch(branch))));
  const resetFilters = () => { setSearch(""); setBranchFilter("all"); setOnlyUnassigned(false); };
  return <PageShell>
    <PageHeader title="Клубы и филиалы" description="Управляйте структурой компании, командой и контактами филиалов." actions={<Button onClick={openClub}><Plus data-icon="inline-start" />Создать клуб</Button>} />
    <section aria-label="Структура компании" className="grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border bg-background lg:grid-cols-4">
      <MetricCard title="Клубы" value={clubs.length} loading={dataLoading || dataError} note="В выбранной области" />
      <MetricCard title="Активные филиалы" value={scopedBranches.filter(branch=>branch.active).length} loading={dataLoading || dataError} note="Доступны для новых заявок" onClick={()=>{setBranchFilter("active");setOnlyUnassigned(false);setSearch("");}} />
      <MetricCard title="Без руководителя" value={scopedBranches.filter(branch=>branch.active && !branch.managerAdminId).length} loading={dataLoading || dataError} note="Активные филиалы" tone={scopedBranches.some(branch=>branch.active && !branch.managerAdminId)?"warning":"neutral"} onClick={()=>{setBranchFilter("active");setOnlyUnassigned(true);setSearch("");}} />
      <MetricCard title="В архиве" value={scopedBranches.filter(branch=>!branch.active).length} loading={dataLoading || dataError} note="История сохранена" onClick={scopeBranchId?undefined:()=>{setBranchFilter("archived");setOnlyUnassigned(false);setSearch("");}} />
    </section>
    <SectionCard flush>
      {!scopeBranchId && <div className="border-b border-border px-4 pt-2"><ToggleGroup type="single" value={branchFilter} aria-label="Статус филиалов" onValueChange={value=>{if(value){setBranchFilter(value);setOnlyUnassigned(false);}}} className="h-11 max-w-full justify-start gap-3 overflow-x-auto rounded-none bg-transparent p-0">{[{value:"active",label:"Активные",count:scopedBranches.filter(b=>b.active).length},{value:"archived",label:"Архив",count:scopedBranches.filter(b=>!b.active).length},{value:"all",label:"Все филиалы",count:scopedBranches.length}].map(item=><ToggleGroupItem key={item.value} value={item.value} className="h-11 shrink-0 gap-1.5 rounded-none border-b-2 border-transparent bg-transparent! px-1 text-xs shadow-none! data-[state=on]:border-blue-600 data-[state=on]:text-blue-700!">{item.label}<span className="rounded-sm px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">{dataLoading || dataError?"—":item.count}</span></ToggleGroupItem>)}</ToggleGroup></div>}
      <div className={toolbarClass}>
        <SearchInput id="club-search" aria-label="Поиск клубов и филиалов" placeholder="Название, адрес, руководитель…" value={search} onChange={e=>setSearch(e.target.value)} />
        {(scopeBranchId || branchFilter!=="archived") && <Button variant={onlyUnassigned?"secondary":"ghost"} size="sm" className="h-9 gap-1.5 text-xs" aria-pressed={onlyUnassigned} onClick={()=>setOnlyUnassigned(value=>!value)}><UserRound className="h-3.5 w-3.5" />Без руководителя</Button>}
        <span role="status" className="ml-auto text-xs tabular-nums text-muted-foreground">{dataError?"Данные недоступны":dataLoading?"Загрузка…":`Клубов: ${filtered.length} · Филиалов: ${foundBranches.length}`}</span>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={clubsQuery.isFetching || branchesQuery.isFetching} aria-label="Обновить клубы и филиалы" onClick={()=>void refresh()}><RefreshCw className="h-3.5 w-3.5" /></Button>
      </div>
      {(search || onlyUnassigned) && <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground"><span>{onlyUnassigned?"Активные филиалы без руководителя":"Результаты поиска"}</span><button type="button" className="text-blue-700 hover:underline" onClick={resetFilters}>Сбросить фильтры</button></div>}
      <div className="p-4 sm:p-5">
        {dataError ? <ErrorState message="Не удалось загрузить структуру компании" onRetry={()=>void refresh()} /> : dataLoading ? <LoadingState label="Загрузка клубов и филиалов…" /> : !clubs.length ? <EmptyState title="Создайте первый клуб" description="Клуб объединяет филиалы. Добавьте клуб, затем укажите площадки, контакты и руководителей." action={<Button onClick={openClub}><Plus className="h-4 w-4" />Создать клуб</Button>} /> : !filtered.length ? <EmptyState title={onlyUnassigned?"Все руководители назначены":"Филиалы не найдены"} description={onlyUnassigned?"В выбранной области нет активных филиалов без руководителя.":"Измените поиск или выберите другой статус филиалов."} action={<Button variant="secondary" onClick={resetFilters}>Показать все</Button>} /> : <div className="flex flex-col gap-6">
          {filtered.map(club=>{
            const clubBranches=foundBranches.filter(branch=>branch.clubId===club.clubId);
            return <section key={club.clubId} aria-label={`Клуб ${club.name}`} className="min-w-0">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="break-words text-sm font-semibold text-foreground">{club.name}</h2><span className="rounded-md bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">Филиалов: {clubBranches.length}</span></div><p className="mt-1 break-words text-xs leading-5 text-muted-foreground">{[club.address,club.phoneNumber,club.email].filter(Boolean).join(" · ") || "Контакты клуба пока не указаны"}</p></div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="secondary" size="sm" className="h-9 gap-1.5 text-xs" onClick={()=>openBranch(club)}><Plus className="h-3.5 w-3.5" />Добавить филиал</Button>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={`Действия с клубом ${club.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={()=>{setError("");setDeleteTarget({type:"club",id:club.clubId,name:club.name});}}><Trash2 />Удалить клуб</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </div>
              </div>
              {!clubBranches.length ? <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center"><p className="text-sm font-medium text-foreground">{branches.some(branch=>branch.clubId===club.clubId)?"Нет филиалов по выбранным фильтрам":"Первый филиал этого клуба"}</p><p className="mt-1 text-xs text-muted-foreground">{branches.some(branch=>branch.clubId===club.clubId)?"Выберите «Все филиалы», чтобы увидеть полную структуру клуба.":"Добавьте площадку, назначьте руководителя и заполните контакты."}</p><Button variant="ghost" size="sm" className="mt-3 text-xs" onClick={()=>branches.some(branch=>branch.clubId===club.clubId)?resetFilters():openBranch(club)}>{branches.some(branch=>branch.clubId===club.clubId)?"Показать все филиалы":"Добавить филиал"}</Button></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{clubBranches.map(branch=><BranchCard key={branch.branchId} branch={branch} onOpen={()=>setPreviewBranch(branch)} onEdit={()=>openBranch(club,branch)} onArchive={()=>{setError("");setArchiveTarget(branch);}} />)}</div>}
            </section>;
          })}
        </div>}
      </div>
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
    {branchClub && <BranchEditor club={branchClub} branch={editingBranch} onClose={closeBranch} onSaved={refresh} />}
    {previewBranch && <BranchDetails branch={previewBranch} clubName={clubs.find(club => club.clubId === previewBranch.clubId)?.name || "Филиал"} onClose={() => setPreviewBranch(null)} onEdit={() => { const club = clubs.find(item => item.clubId === previewBranch.clubId); if (club) openBranch(club, previewBranch); setPreviewBranch(null); }} onArchive={() => { setError(""); setArchiveTarget(previewBranch); setPreviewBranch(null); }} onRestore={() => { setError(""); setArchiveTarget(previewBranch); setPreviewBranch(null); }} />}
    {archiveTarget && <ModalShell title={archiveTarget.active ? "Архивировать филиал?" : "Восстановить филиал?"} description={archiveTarget.name} maxWidthClassName="max-w-md" closeDisabled={pending} onClose={() => setArchiveTarget(null)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={() => setArchiveTarget(null)}>Отмена</Button><Button disabled={pending} onClick={() => void changeArchive()}>{pending ? "Сохранение…" : archiveTarget.active ? "Архивировать" : "Восстановить"}</Button></div>}><p className="text-sm text-muted-foreground">{archiveTarget.active ? "История, сотрудники и связанные записи сохранятся. Филиал исчезнет из выбора для новых заявок. Существующие занятия и договоры продолжат действовать; их нужно завершить или перенести отдельно." : "Филиал снова появится в списке активных и будет доступен для новых заявок."}</p>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}</ModalShell>}
    {deleteTarget && <ModalShell title={deleteTarget.type === "club" ? "Удалить клуб?" : "Удалить филиал?"} description={deleteTarget.name} closeDisabled={pending} maxWidthClassName="max-w-md" onClose={() => setDeleteTarget(null)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={() => setDeleteTarget(null)}>Отмена</Button><Button variant="danger" disabled={pending} onClick={() => void remove()}>{pending ? "Удаление…" : "Удалить"}</Button></div>}><p className="text-sm text-muted-foreground">Удаление нельзя отменить. Если есть связанные записи, сначала завершите работу с ними.</p>{error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}</ModalShell>}
  </PageShell>;
};
export default ClubsAndBranchesPage;
