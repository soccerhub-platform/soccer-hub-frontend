import React, { useEffect, useState } from "react";
import { useAuth } from "../../shared/AuthContext";
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  ChevronDown,
} from "lucide-react";
import { apiClient, getApiErrorMessage } from "../../shared/api";
import toast from "react-hot-toast";
import {
  formatPhoneInput,
  isValidFormattedPhone,
  normalizePhoneForSubmit,
} from "../../shared/phone";
import {
  Input,
  Button,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  ModalShell,
  PageHeader,
  PageShell,
  SectionCard,
  formControlClassName,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
 } from "../../shared/ui";

interface ClubView {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface BranchView {
  id: string;
  clubId: string;
  name: string;
  address?: string;
}

interface ClubApiDto {
  clubId: string;
  name: string;
  slug: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
}

interface BranchApiDto {
  branchId: string;
  clubId: string;
  name: string;
  address?: string;
}

interface ClubFormState {
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
}

interface BranchFormState {
  name: string;
  address: string;
}

const ClubsAndBranchesPage: React.FC = () => {
  const { user } = useAuth();

  const [clubs, setClubs] = useState<ClubView[]>([]);
  const [branches, setBranches] = useState<BranchView[]>([]);

  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [clubsError, setClubsError] = useState<string | null>(null);
  const [branchesError, setBranchesError] = useState<string | null>(null);

  const [expandedClubId, setExpandedClubId] = useState<string | null>(null);

  // модалки
  const [showCreateClubModal, setShowCreateClubModal] = useState(false);
  const [showCreateBranchModal, setShowCreateBranchModal] = useState(false);
  const [branchClubId, setBranchClubId] = useState<string | null>(null);

  // формы
  const [clubForm, setClubForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
  });

  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
  });

  const normalizeSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");

  const isValidEmail = (value: string) =>
    value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const isValidPhone = (value: string) =>
    value.length === 0 || isValidFormattedPhone(value);

  // ---- Загрузка клубов ----
  const loadClubs = async () => {
    setLoadingClubs(true);
    setClubsError(null);
    try {
      const data = await apiClient.get<{ clubs?: ClubApiDto[] }>("/dispatcher/club");

      const apiClubs = data.clubs ?? [];

      setClubs(
        apiClubs.map((c) => ({
          id: c.clubId,
          name: c.name,
          slug: c.slug,
          email: c.email,
          phone: c.phoneNumber,
          address: c.address,
        }))
      );
    } catch (err) {
      console.error("Failed to load clubs", err);
      setClubsError(getApiErrorMessage(err, "Не удалось загрузить клубы"));
      setClubs([]);
    } finally {
      setLoadingClubs(false);
    }
  };

  // ---- Загрузка филиалов ----
  const loadBranches = async () => {
    setLoadingBranches(true);
    setBranchesError(null);
    try {
      const data = await apiClient.get<{ branches?: BranchApiDto[] }>("/dispatcher/branch");

      const apiBranches = data.branches ?? [];

      setBranches(
        apiBranches.map((b) => ({
          id: b.branchId,
          clubId: b.clubId,
          name: b.name,
          address: b.address,
        }))
      );
    } catch (err) {
      console.error("Failed to load branches", err);
      setBranchesError(getApiErrorMessage(err, "Не удалось загрузить филиалы"));
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  // начальная загрузка
  useEffect(() => {
    if (!user?.accessToken) return;
    loadClubs();
    loadBranches();
  }, [user?.accessToken]);

  // ---- Создать клуб ----
  const handleCreateClub = async () => {
    if (!clubForm.name.trim()) {
      toast.error("Название клуба обязательно");
      return;
    }
    if (!clubForm.slug.trim()) {
      toast.error("Укажите slug клуба");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(clubForm.slug)) {
      toast.error("Slug должен содержать только латиницу, цифры и дефисы");
      return;
    }
    if (!isValidEmail(clubForm.email)) {
      toast.error("Неверный формат email");
      return;
    }
    if (!isValidPhone(clubForm.phone)) {
      toast.error("Неверный формат телефона");
      return;
    }

    try {
      const payload = {
        ...clubForm,
        name: clubForm.name.trim(),
        slug: normalizeSlug(clubForm.slug),
        email: clubForm.email.trim(),
        phone: normalizePhoneForSubmit(clubForm.phone),
        address: clubForm.address.trim(),
      };
      await apiClient.post("/dispatcher/club/create", payload);

      toast.success("Клуб успешно создан");
      setShowCreateClubModal(false);
      setClubForm({ name: "", slug: "", email: "", phone: "", address: "" });

      loadClubs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось создать клуб"));
    }
  };

  // ---- Создать филиал ----
  const handleCreateBranch = async () => {
    if (!branchClubId) return;
    if (!branchForm.name.trim()) {
      toast.error("Название филиала обязательно");
      return;
    }

    try {
      await apiClient.post("/dispatcher/branch/create", {
        clubId: branchClubId,
        name: branchForm.name.trim(),
        address: branchForm.address.trim(),
      });

      toast.success("Филиал создан");

      setShowCreateBranchModal(false);
      setBranchForm({ name: "", address: "" });

      loadBranches();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось создать филиал"));
    }
  };

  // ---- Удалить клуб ----
  const deleteClub = async (clubId: string) => {
    if (!confirm("Удалить клуб?")) return;

    try {
      await apiClient.delete(`/dispatcher/club/${clubId}`);

      toast.success("Клуб удалён");
      setExpandedClubId((prev) => (prev === clubId ? null : prev));
      loadClubs();
      loadBranches();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось удалить клуб"));
    }
  };

  // ---- Удалить филиал ----
  const deleteBranch = async (branchId: string) => {
    if (!confirm("Удалить филиал?")) return;

    try {
      await apiClient.delete(`/dispatcher/branch/${branchId}`);

      toast.success("Филиал удалён");
      loadBranches();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Не удалось удалить филиал"));
    }
  };

  // ---- Раскрытие строки клуба ----
  const toggleClubExpand = (clubId: string) =>
    setExpandedClubId((prev) => (prev === clubId ? null : clubId));

  return (
    <PageShell>
      <PageHeader
        title="Клубы и филиалы"
        description="Управляйте клубами и филиалами, которые доступны диспетчерам и администраторам."
        actions={
          <Button type="button" onClick={() => setShowCreateClubModal(true)}>
            <Plus className="h-4 w-4" />
            Создать клуб
          </Button>
        }
      />

      <SectionCard>
        {clubsError ? (
          <ErrorState message={clubsError} onRetry={loadClubs} />
        ) : loadingClubs ? (
          <LoadingState label="Загрузка клубов..." />
        ) : clubs.length === 0 ? (
          <EmptyState
            title="Клубов пока нет"
            description="Создайте первый клуб, затем добавьте к нему филиалы."
            action={
              <Button type="button" size="sm" onClick={() => setShowCreateClubModal(true)}>
                <Plus className="h-4 w-4" />
                Создать клуб
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full divide-y divide-slate-200">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Клуб
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Контакты
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Адрес
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Филиалы
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">
                    Действия
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-200">
                {clubs.map((club) => {
                  const clubBranches = branches.filter(
                    (b) => b.clubId === club.id
                  );
                  const isExpanded = expandedClubId === club.id;

                  return (
                    <React.Fragment key={club.id}>
                      {/* Основная строка клуба */}
                      <TableRow
                        className="cursor-pointer transition-colors hover:bg-slate-50"
                        onClick={() => toggleClubExpand(club.id)}
                      >
                        {/* Клуб + slug */}
                        <TableCell className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-blue-50 sm:flex">
                              <Building2 className="h-5 w-5 text-[#0066cc]" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {club.name}
                              </div>
                              <div className="text-xs text-slate-400">
                                slug: {club.slug}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Контакты */}
                        <TableCell className="px-4 py-3 text-sm">
                          <div className="flex flex-col space-y-0.5 text-xs text-slate-600">
                            {club.phone && (
                              <span className="flex items-center">
                                <Phone className="mr-1 h-4 w-4 text-slate-400" />
                                {club.phone}
                              </span>
                            )}
                            {club.email && (
                              <span className="flex items-center">
                                <Mail className="mr-1 h-4 w-4 text-slate-400" />
                                {club.email}
                              </span>
                            )}
                            {!club.phone && !club.email && (
                              <span className="text-slate-400">
                                Контакты не указаны
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Адрес */}
                        <TableCell className="px-4 py-3 text-sm">
                          {club.address ? (
                            <div className="flex items-center text-xs text-slate-600">
                              <MapPin className="mr-1 h-4 w-4 text-slate-400" />
                              <span className="truncate">{club.address}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Не указан
                            </span>
                          )}
                        </TableCell>

                        {/* Кол-во филиалов */}
                        <TableCell className="px-4 py-3 text-sm">
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0066cc]">
                            {clubBranches.length}{" "}
                            <span className="ml-1 hidden sm:inline">
                              филиал(ов)
                            </span>
                          </span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell
                          className="px-4 py-3 text-sm text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="soft"
                              onClick={() => {
                                setBranchClubId(club.id);
                                setShowCreateBranchModal(true);
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              Филиал
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="softDanger"
                              onClick={() => deleteClub(club.id)}
                            >
                              Удалить
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              rounded="rounded-full"
                              onClick={() => toggleClubExpand(club.id)}
                              className="h-8 w-8 p-0"
                            >
                              <ChevronDown
                                className={`h-5 w-5 text-slate-400 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Вложенный блок с филиалами */}
                      {isExpanded && (
                        <TableRow className="bg-slate-50/70">
                          <TableCell
                            className="px-4 pb-4 pt-1 text-sm text-slate-700"
                            colSpan={5}
                          >
                            <div className="mt-2 space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex items-center justify-between">
                                <span className="ui-section-title">
                                  Филиалы клуба "{club.name}"
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setBranchClubId(club.id);
                                    setShowCreateBranchModal(true);
                                  }}
                                >
                                  <Plus className="h-4 w-4" />
                                  Добавить филиал
                                </Button>
                              </div>

                              {branchesError ? (
                                <ErrorState
                                  title="Не удалось загрузить филиалы"
                                  message={branchesError}
                                  onRetry={loadBranches}
                                />
                              ) : loadingBranches ? (
                                <div className="text-xs text-slate-500">Загрузка филиалов...</div>
                              ) : clubBranches.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                                  У этого клуба пока нет филиалов.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <Table className="min-w-full text-xs">
                                    <TableHeader>
                                      <TableRow className="border-b border-slate-200 bg-slate-50">
                                        <TableHead className="px-3 py-2 text-left font-medium uppercase text-slate-500">
                                          Название
                                        </TableHead>
                                        <TableHead className="px-3 py-2 text-left font-medium uppercase text-slate-500">
                                          Адрес
                                        </TableHead>
                                        <TableHead className="px-3 py-2 text-right font-medium uppercase text-slate-500">
                                          Действия
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {clubBranches.map((b) => (
                                        <TableRow
                                          key={b.id}
                                          className="border-b border-slate-100 hover:bg-slate-50"
                                        >
                                          <TableCell className="px-3 py-2 font-medium text-slate-900">
                                            {b.name}
                                          </TableCell>
                                          <TableCell className="px-3 py-2 text-slate-600">
                                            {b.address ? (
                                              <div className="flex items-center">
                                                <MapPin className="mr-1 h-3 w-3 text-slate-400" />
                                                <span className="truncate">
                                                  {b.address}
                                                </span>
                                              </div>
                                            ) : (
                                              <span className="text-slate-400">
                                                Не указан
                                              </span>
                                            )}
                                          </TableCell>
                                          <TableCell className="px-3 py-2 text-right">
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="softDanger"
                                              onClick={() => deleteBranch(b.id)}
                                            >
                                              Удалить
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {/* ----- MODAL: CREATE CLUB ----- */}
      {showCreateClubModal && (
        <CreateClubModal
          form={clubForm}
          setForm={setClubForm}
          onSave={handleCreateClub}
          onClose={() => setShowCreateClubModal(false)}
          normalizeSlug={normalizeSlug}
        />
      )}

      {/* ----- MODAL: CREATE BRANCH ----- */}
      {showCreateBranchModal && branchClubId && (
        <CreateBranchModal
          form={branchForm}
          setForm={setBranchForm}
          onSave={handleCreateBranch}
          onClose={() => setShowCreateBranchModal(false)}
        />
      )}
    </PageShell>
  );
};

/* ----------- МОДАЛКИ ----------- */

const CreateClubModal = ({
  form,
  setForm,
  onSave,
  onClose,
  normalizeSlug,
}: {
  form: ClubFormState;
  setForm: React.Dispatch<React.SetStateAction<ClubFormState>>;
  onSave: () => void | Promise<void>;
  onClose: () => void;
  normalizeSlug: (value: string) => string;
}) => (
  <ModalShell
    title="Создать клуб"
    description="Добавьте клуб, к которому позже можно привязать филиалы."
    onClose={onClose}
    maxWidthClassName="max-w-xl"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" onClick={onSave}>
          Создать
        </Button>
      </div>
    }
  >
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FormField label="Название*">
        <Input
          type="text"
          className={formControlClassName}
          value={form.name}
          onChange={(e) => {
            const value = e.target.value;
            setForm({
              ...form,
              name: value,
              slug: form.slug ? form.slug : normalizeSlug(value),
            });
          }}
          required
        />
      </FormField>

      <FormField label="Slug*" hint="Только латиница, цифры и дефисы">
        <Input
          type="text"
          placeholder="my-club"
          className={formControlClassName}
          value={form.slug}
          onChange={(e) =>
            setForm({ ...form, slug: normalizeSlug(e.target.value) })
          }
          required
        />
      </FormField>

      <FormField label="Email">
        <Input
          type="email"
          className={formControlClassName}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </FormField>

      <FormField label="Телефон">
        <Input
          type="tel"
          className={formControlClassName}
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: formatPhoneInput(e.target.value) })}
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
          placeholder="+7 777 123 45 67"
        />
      </FormField>

      <FormField label="Адрес" className="md:col-span-2">
        <Input
          type="text"
          className={formControlClassName}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </FormField>
    </div>
  </ModalShell>
);

const CreateBranchModal = ({
  form,
  setForm,
  onSave,
  onClose,
}: {
  form: BranchFormState;
  setForm: React.Dispatch<React.SetStateAction<BranchFormState>>;
  onSave: () => void | Promise<void>;
  onClose: () => void;
}) => (
  <ModalShell
    title="Создать филиал"
    description="Филиал будет добавлен к выбранному клубу."
    onClose={onClose}
    maxWidthClassName="max-w-lg"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" onClick={onSave}>
          Создать
        </Button>
      </div>
    }
  >
    <div className="space-y-3">
      <FormField label="Название*">
        <Input
          type="text"
          className={formControlClassName}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </FormField>

      <FormField label="Адрес">
        <Input
          type="text"
          className={formControlClassName}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </FormField>
    </div>
  </ModalShell>
);

export default ClubsAndBranchesPage;
