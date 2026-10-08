import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Mail,
  KeyRound,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import toast from "react-hot-toast";
import { Field, FieldLabel } from "../../shared/ui/shadcn/field";

import { useAuth } from "../../shared/AuthContext";
import { apiClient, getApiErrorMessage } from "../../shared/api";
import {
  formatPhoneInput,
  isValidFormattedPhone,
  normalizePhoneForSubmit,
} from "../../shared/phone";
import {
  Input,
  NativeSelect,
  Button,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  MetricCard,
  ModalShell,
  PageHeader,
  PageShell,
  SectionCard,
  StatusBadge,
  ToggleGroup,
  ToggleGroupItem,
  formControlClassName,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
   } from "../../shared/ui";

interface BranchAssignment {
  branchId: string;
  branchName: string;
  clubId: string;
  clubName: string;
}

interface AdminView {
  adminId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string;
  active: boolean;
  branches: BranchAssignment[];
}

interface BranchOption {
  branchId: string;
  name: string;
}

interface AdminApiDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone?: string;
  isActive?: boolean;
  active?: boolean;
  branches?: BranchAssignment[];
}

interface BranchOptionDto {
  branchId: string;
  name: string;
}

type StatusFilter = "all" | "active" | "inactive";

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidPhone = (value: string) =>
  value.length === 0 || isValidFormattedPhone(value);

const getInitials = (admin: AdminView) => {
  const f = admin.firstName?.[0] ?? "";
  const l = admin.lastName?.[0] ?? "";
  return (f + l).toUpperCase();
};

const AdminsPage: React.FC = () => {
  const { user } = useAuth();

  const [admins, setAdmins] = useState<AdminView[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unassignTarget, setUnassignTarget] = useState<{ adminId: string; branchId: string; name: string } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showCreatedPasswordModal, setShowCreatedPasswordModal] = useState(false);

  const [selectedAdmin, setSelectedAdmin] = useState<AdminView | null>(null);
  const [createdAdminPassword, setCreatedAdminPassword] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteInput, setDeleteInput] = useState("");
  const [assignBranchId, setAssignBranchId] = useState("");

  const [createForm, setCreateForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    assignedBranch: "",
  });

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const loadAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.get<{ admins?: AdminApiDto[] }>("/dispatcher/admin");
      const rawAdmins = data.admins ?? [];

      const refreshedAdmins = rawAdmins.map((a) => ({
          adminId: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          email: a.email,
          phone: a.phone,
          active: a.isActive ?? a.active ?? false,
          branches: Array.isArray(a.branches)
            ? a.branches.map((b) => ({
                branchId: b.branchId,
                branchName: b.branchName,
                clubId: b.clubId,
                clubName: b.clubName,
              }))
            : [],
        }));
      setAdmins(refreshedAdmins);
      setSelectedAdmin((current) => current
        ? refreshedAdmins.find((admin) => admin.adminId === current.adminId) ?? null
        : null);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, "Не удалось загрузить администраторов"));
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    try {
      const data = await apiClient.get<{ branches?: BranchOptionDto[] } | BranchOptionDto[]>(
        "/dispatcher/branch"
      );
      const raw = Array.isArray(data) ? data : data.branches ?? [];
      setBranches(raw.map((b) => ({ branchId: b.branchId, name: b.name })));
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Не удалось загрузить филиалы"));
    }
  };

  useEffect(() => {
    if (!user?.accessToken) return;
    void loadAdmins();
    void loadBranches();
  }, [user?.accessToken]);

  const filteredAdmins = useMemo(() => {
    const term = search.trim().toLowerCase();

    return admins.filter((admin) => {
      if (statusFilter === "active" && !admin.active) return false;
      if (statusFilter === "inactive" && admin.active) return false;
      if (!term) return true;

      const fullName = `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.toLowerCase();
      const email = (admin.email ?? "").toLowerCase();
      const phone = (admin.phone ?? "").toLowerCase();

      return fullName.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [admins, search, statusFilter]);

  const totalAdmins = admins.length;
  const activeAdmins = admins.filter((a) => a.active).length;
  const unassignedAdmins = admins.filter((a) => a.branches.length === 0).length;

  const handleCreateAdmin = async () => {
    if (pending) return;
    if (!createForm.email.trim() || !isValidEmail(createForm.email.trim())) {
      toast.error("Укажите корректный email");
      return;
    }
    if (!createForm.firstName.trim()) {
      toast.error("Имя обязательно");
      return;
    }
    if (!createForm.lastName.trim()) {
      toast.error("Фамилия обязательна");
      return;
    }
    if (!isValidPhone(createForm.phone.trim())) {
      toast.error("Неверный формат телефона");
      return;
    }
    if (!createForm.assignedBranch) {
      toast.error("Выберите филиал");
      return;
    }

    setPending(true);
    try {
      const data = await apiClient.post<{ tempPassword?: string }>("/dispatcher/admin/register", {
        ...createForm,
        email: createForm.email.trim(),
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        phone: normalizePhoneForSubmit(createForm.phone),
      });

      if (data?.tempPassword) {
        setCreatedAdminPassword(data.tempPassword);
        setShowCreatedPasswordModal(true);
      } else {
        toast.success("Администратор создан");
      }

      setShowCreateModal(false);
      setCreateForm({ email: "", firstName: "", lastName: "", phone: "", assignedBranch: "" });
      await loadAdmins();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка создания администратора"));
    } finally {
      setPending(false);
    }
  };

  const openEditModal = (admin: AdminView) => {
    setSelectedAdmin(admin);
    setEditForm({
      firstName: admin.firstName,
      lastName: admin.lastName,
      phone: formatPhoneInput(admin.phone ?? ""),
    });
    setShowEditModal(true);
  };

  const handleEditAdmin = async () => {
    if (pending) return;
    if (!selectedAdmin) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error("Имя и фамилия обязательны");
      return;
    }
    if (!isValidPhone(editForm.phone.trim())) {
      toast.error("Неверный формат телефона");
      return;
    }

    setPending(true);
    try {
      await apiClient.put(`/dispatcher/admin/${selectedAdmin.adminId}`, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        phone: normalizePhoneForSubmit(editForm.phone),
      });
      toast.success("Данные администратора сохранены");
      setShowEditModal(false);
      setSelectedAdmin(null);
      await loadAdmins();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка сохранения"));
    } finally {
      setPending(false);
    }
  };

  const toggleStatus = async (adminId: string, nextActive: boolean) => {
    if (pending) return;
    setPending(true);
    try {
      await apiClient.patch(`/dispatcher/admin/${adminId}/status`, { active: nextActive });
      toast.success(nextActive ? "Администратор включен" : "Администратор отключен");
      await loadAdmins();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка смены статуса"));
    } finally {
      setPending(false);
    }
  };

  const openAssignBranchModal = (admin: AdminView) => {
    setSelectedAdmin(admin);
    setAssignBranchId("");
    setShowAssignModal(true);
  };

  const handleAssignBranch = async () => {
    if (pending) return;
    if (!selectedAdmin || !assignBranchId) {
      toast.error("Выберите филиал");
      return;
    }

    setPending(true);
    try {
      await apiClient.patch(`/dispatcher/admin/${selectedAdmin.adminId}/assign-branch`, {
        branchId: assignBranchId,
      });
      toast.success("Филиал назначен");
      setShowAssignModal(false);
      setSelectedAdmin(null);
      await loadAdmins();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка назначения филиала"));
    } finally {
      setPending(false);
    }
  };

  const handleUnassignBranch = async (adminId: string, branchId: string) => {
    if (pending) return;
    setPending(true);

    try {
      await apiClient.patch(`/dispatcher/admin/${adminId}/unassign-branch`, { branchId });
      toast.success("Филиал откреплен");
      setUnassignTarget(null);
      setShowDetailsModal(false);
      setSelectedAdmin(null);
      await loadAdmins();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка открепления филиала"));
    } finally {
      setPending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedAdmin) return;

    setResetLoading(true);
    try {
      const data = await apiClient.post<{ temporaryPassword: string }>(
        `/dispatcher/admin/${selectedAdmin.adminId}/reset-password`
      );
      setResetPasswordValue(data.temporaryPassword);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка сброса пароля"));
      setShowResetPasswordModal(false);
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (pending) return;
    if (!selectedAdmin) return;

    if (deleteInput !== selectedAdmin.adminId) {
      toast.error("ID неверный. Удаление не подтверждено.");
      return;
    }

    setPending(true);
    try {
      await apiClient.delete(`/dispatcher/admin/${selectedAdmin.adminId}`);
      toast.success("Администратор удален");
      setShowDeleteModal(false);
      setShowDetailsModal(false);
      setSelectedAdmin(null);
      setDeleteInput("");
      await loadAdmins();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка удаления администратора"));
    } finally {
      setPending(false);
    }
  };

  if (!user?.accessToken) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Администраторы"
        description="Управление доступом администраторов и привязкой к филиалам."
        actions={
          <Button type="button" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Добавить администратора
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-2 md:gap-3">
        <MetricCard title="Всего" value={totalAdmins} tone="neutral" />
        <MetricCard title="Активны" value={activeAdmins} tone="success" />
        <MetricCard title="Без филиала" value={unassignedAdmins} tone={unassignedAdmins ? "warning" : "neutral"} />
      </div>

      <SectionCard>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
          <FormField label="Поиск">
            <Input
              type="text"
              placeholder="Имя, email или телефон"
              className={formControlClassName}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </FormField>

          <Field><FieldLabel>Статус</FieldLabel>
            <ToggleGroup type="single" aria-label="Статус администратора" value={statusFilter} onValueChange={value => value && setStatusFilter(value as StatusFilter)} variant="outline" className="w-full">
              {[
                ["all", "Все"],
                ["active", "Активны"],
                ["inactive", "Отключены"],
              ].map(([value, label]) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex-1"
                >
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
        </div>
      </SectionCard>

      <SectionCard>
        {error ? (
          <ErrorState message={error} onRetry={loadAdmins} />
        ) : loading ? (
          <LoadingState label="Загрузка администраторов..." />
        ) : filteredAdmins.length === 0 ? (
          <EmptyState
            title={admins.length ? "Администраторы не найдены" : "Добавьте администратора"}
            description={admins.length ? "Измените поисковый запрос или статус." : "Назначьте администратора филиалу, чтобы он мог обрабатывать заявки."}
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!admins.length) { setShowCreateModal(true); return; }
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                {admins.length ? "Сбросить фильтры" : "Добавить администратора"}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-full divide-y divide-slate-200">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Администратор
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Контакты
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Филиалы
                  </TableHead>
                  <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Статус
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">
                    Действия
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-200">
                {filteredAdmins.map((admin) => (
                  <TableRow
                    key={admin.adminId}
                    className="transition-colors hover:bg-slate-50"
                    onClick={() => {
                      setSelectedAdmin(admin);
                      setShowDetailsModal(true);
                    }}
                  >
                    <TableCell className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-semibold text-[#0066cc]">
                          {getInitials(admin)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">
                            {admin.firstName} {admin.lastName}
                          </div>
                          <div className="text-xs text-slate-400">ID: {admin.adminId.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-slate-600">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {admin.email || "Email не указан"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone className="h-4 w-4 text-slate-400" />
                          {admin.phone || "Телефон не указан"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-slate-600">
                      <BranchBadges branches={admin.branches} />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      <StatusBadge tone={admin.active ? "success" : "danger"}>{admin.active ? "Активен" : "Отключен"}</StatusBadge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedAdmin(admin);
                          setShowDetailsModal(true);
                        }}
                      >
                        Открыть
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {showDetailsModal && selectedAdmin ? (
        <AdminDetailsModal
          admin={selectedAdmin}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedAdmin(null);
          }}
          onAssign={() => {
            setShowDetailsModal(false);
            openAssignBranchModal(selectedAdmin);
          }}
          onEdit={() => {
            setShowDetailsModal(false);
            openEditModal(selectedAdmin);
          }}
          onToggleStatus={() => {
            void toggleStatus(selectedAdmin.adminId, !selectedAdmin.active);
            setShowDetailsModal(false);
          }}
          onResetPassword={() => {
            setShowDetailsModal(false);
            setResetPasswordValue(null);
            setShowResetPasswordModal(true);
          }}
          onDelete={() => {
            setShowDetailsModal(false);
            setDeleteInput("");
            setShowDeleteModal(true);
          }}
          onUnassignBranch={(adminId, branchId) => {
            setUnassignTarget({ adminId, branchId, name: selectedAdmin.branches.find(branch => branch.branchId === branchId)?.branchName || "Филиал" });
            setShowDetailsModal(false);
          }}
        />
      ) : null}

      {showCreateModal ? (
        <CreateAdminModal
          pending={pending}
          form={createForm}
          branches={branches}
          onChange={setCreateForm}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateAdmin}
        />
      ) : null}

      {showEditModal && selectedAdmin ? (
        <EditAdminModal
          pending={pending}
          admin={selectedAdmin}
          form={editForm}
          onChange={setEditForm}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditAdmin}
        />
      ) : null}

      {showAssignModal && selectedAdmin ? (
        <AssignBranchModal
          pending={pending}
          admin={selectedAdmin}
          branches={branches}
          branchId={assignBranchId}
          onChange={setAssignBranchId}
          onClose={() => setShowAssignModal(false)}
          onSave={handleAssignBranch}
        />
      ) : null}

      {showCreatedPasswordModal && createdAdminPassword ? (
        <PasswordResultModal
          title="Администратор создан"
          password={createdAdminPassword}
          onClose={() => {
            setShowCreatedPasswordModal(false);
            setCreatedAdminPassword(null);
          }}
        />
      ) : null}

      {showResetPasswordModal && selectedAdmin ? (
        <ResetPasswordModal
          admin={selectedAdmin}
          password={resetPasswordValue}
          loading={resetLoading}
          onReset={handleResetPassword}
          onClose={() => {
            setShowResetPasswordModal(false);
            setResetPasswordValue(null);
            setSelectedAdmin(null);
          }}
        />
      ) : null}

      {showDeleteModal && selectedAdmin ? (
        <DeleteAdminModal
          pending={pending}
          admin={selectedAdmin}
          value={deleteInput}
          onChange={setDeleteInput}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDeleteAdmin}
        />
      ) : null}
      {unassignTarget && <ModalShell title="Открепить филиал?" description={unassignTarget.name} closeDisabled={pending} maxWidthClassName="max-w-md" onClose={() => setUnassignTarget(null)} footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={pending} onClick={() => setUnassignTarget(null)}>Отмена</Button><Button disabled={pending} onClick={() => void handleUnassignBranch(unassignTarget.adminId, unassignTarget.branchId)}>Открепить</Button></div>}><p className="text-sm text-muted-foreground">Администратор потеряет доступ к этому филиалу. Его можно назначить повторно.</p></ModalShell>}
    </PageShell>
  );
};

const BranchBadges: React.FC<{ branches: BranchAssignment[] }> = ({ branches }) => {
  if (branches.length === 0) {
    return <span className="text-xs text-slate-400">Не привязан к филиалам</span>;
  }

  const firstBranch = branches[0];

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-xs text-[#0066cc]">
        {firstBranch.branchName}
      </span>
      {branches.length > 1 ? (
        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          + еще {branches.length - 1}
        </span>
      ) : null}
    </div>
  );
};

const AdminDetailsModal: React.FC<{
  admin: AdminView;
  onClose: () => void;
  onAssign: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onResetPassword: () => void;
  onDelete: () => void;
  onUnassignBranch: (adminId: string, branchId: string) => void;
}> = ({ admin, onClose, onAssign, onEdit, onToggleStatus, onResetPassword, onDelete, onUnassignBranch }) => (
  <ModalShell
    title={`${admin.firstName} ${admin.lastName}`}
    description="Контакты и доступ к филиалам"
    placement="right"
    onClose={onClose}
    maxWidthClassName="max-w-2xl"
    footer={
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="softDanger" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
          Удалить
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
            Редактировать
          </Button>
          <Button type="button" variant="secondary" onClick={onResetPassword}>
            <KeyRound className="h-4 w-4" />
            Сбросить пароль
          </Button>
          <Button type="button" variant={admin.active ? "softDanger" : "soft"} onClick={onToggleStatus}>
            {admin.active ? "Отключить" : "Включить"}
          </Button>
        </div>
      </div>
    }
  >
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-sm font-semibold text-[#0066cc]">
            {getInitials(admin)}
          </div>
          <div>
            <div className="font-semibold text-slate-900">
              {admin.firstName} {admin.lastName}
            </div>
            <div className="text-sm text-slate-500">{admin.email || "Email не указан"}</div>
          </div>
        </div>
        <StatusBadge tone={admin.active ? "success" : "danger"}>{admin.active ? "Активен" : "Отключен"}</StatusBadge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoBox label="Email" value={admin.email || "Не указан"} icon={<Mail className="h-4 w-4" />} />
        <InfoBox label="Телефон" value={admin.phone || "Не указан"} icon={<Phone className="h-4 w-4" />} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="ui-section-title">Филиалы</div>
            <div className="text-xs text-slate-500">К каким филиалам у администратора есть доступ</div>
          </div>
          <Button type="button" size="sm" onClick={onAssign}>
            <UserPlus className="h-4 w-4" />
            Назначить
          </Button>
        </div>

        {admin.branches.length === 0 ? (
          <EmptyState
            title="Филиалы не назначены"
            description="Назначьте хотя бы один филиал, чтобы администратор мог работать."
          />
        ) : (
          <div className="max-h-64 flex flex-col gap-2 overflow-y-auto pr-1">
            {admin.branches.map((branch) => (
              <div
                key={branch.branchId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">{branch.branchName}</div>
                    <div className="text-xs text-slate-500">{branch.clubName || "Клуб не указан"}</div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="softDanger"
                  onClick={() => onUnassignBranch(admin.adminId, branch.branchId)}
                >
                  Убрать
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  </ModalShell>
);

const InfoBox: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500">
      {icon}
      {label}
    </div>
    <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
  </div>
);

const CreateAdminModal: React.FC<{
  form: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    assignedBranch: string;
  };
  branches: BranchOption[];
  onChange: React.Dispatch<React.SetStateAction<{
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    assignedBranch: string;
  }>>;
  pending: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}> = ({ form, branches, onChange, onClose, onSave, pending }) => (
  <ModalShell
    title="Создать администратора"
    description="После создания система покажет временный пароль один раз."
    onClose={onClose}
    closeDisabled={pending}
    placement="right"
    maxWidthClassName="max-w-xl"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" disabled={pending} onClick={onSave}>
          Создать
        </Button>
      </div>
    }
  >
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Email*">
        <Input
          type="email"
          placeholder="admin@mail.com"
          className={formControlClassName}
          value={form.email}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
        />
      </FormField>
      <FormField label="Телефон">
        <Input
          type="tel"
          placeholder="+7 777 123 45 67"
          className={formControlClassName}
          value={form.phone}
          onChange={(event) => onChange({ ...form, phone: formatPhoneInput(event.target.value) })}
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
        />
      </FormField>
      <FormField label="Имя*">
        <Input
          type="text"
          placeholder="Имя"
          className={formControlClassName}
          value={form.firstName}
          onChange={(event) => onChange({ ...form, firstName: event.target.value })}
        />
      </FormField>
      <FormField label="Фамилия*">
        <Input
          type="text"
          placeholder="Фамилия"
          className={formControlClassName}
          value={form.lastName}
          onChange={(event) => onChange({ ...form, lastName: event.target.value })}
        />
      </FormField>
      <FormField label="Филиал*" className="sm:col-span-2">
        <NativeSelect
          className={formControlClassName}
          value={form.assignedBranch}
          onChange={(event) => onChange({ ...form, assignedBranch: event.target.value })}
        >
          <option value="">Выберите филиал</option>
          {branches.map((branch) => (
            <option key={branch.branchId} value={branch.branchId}>
              {branch.name}
            </option>
          ))}
        </NativeSelect>
      </FormField>
    </div>
  </ModalShell>
);

const EditAdminModal: React.FC<{
  admin: AdminView;
  form: { firstName: string; lastName: string; phone: string };
  onChange: React.Dispatch<React.SetStateAction<{ firstName: string; lastName: string; phone: string }>>;
  pending: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}> = ({ admin, form, onChange, onClose, onSave, pending }) => (
  <ModalShell
    title="Редактировать администратора"
    description={`${admin.firstName} ${admin.lastName}`}
    onClose={onClose}
    closeDisabled={pending}
    placement="right"
    maxWidthClassName="max-w-lg"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" disabled={pending} onClick={onSave}>
          Сохранить
        </Button>
      </div>
    }
  >
    <div className="flex flex-col gap-4">
      <FormField label="Имя*">
        <Input
          type="text"
          className={formControlClassName}
          value={form.firstName}
          onChange={(event) => onChange({ ...form, firstName: event.target.value })}
        />
      </FormField>
      <FormField label="Фамилия*">
        <Input
          type="text"
          className={formControlClassName}
          value={form.lastName}
          onChange={(event) => onChange({ ...form, lastName: event.target.value })}
        />
      </FormField>
      <FormField label="Телефон">
        <Input
          type="tel"
          placeholder="+7 777 123 45 67"
          className={formControlClassName}
          value={form.phone}
          onChange={(event) => onChange({ ...form, phone: formatPhoneInput(event.target.value) })}
          inputMode="tel"
          autoComplete="tel"
          maxLength={16}
        />
      </FormField>
    </div>
  </ModalShell>
);

const AssignBranchModal: React.FC<{
  admin: AdminView;
  branches: BranchOption[];
  branchId: string;
  onChange: (value: string) => void;
  pending: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}> = ({ admin, branches, branchId, onChange, onClose, onSave, pending }) => (
  <ModalShell
    title="Назначить филиал"
    description={`${admin.firstName} ${admin.lastName}`}
    onClose={onClose}
    closeDisabled={pending}
    placement="right"
    maxWidthClassName="max-w-lg"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" disabled={pending} onClick={onSave}>
          Сохранить
        </Button>
      </div>
    }
  >
    <FormField label="Филиал">
      <NativeSelect className={formControlClassName} value={branchId} onChange={(event) => onChange(event.target.value)}>
        <option value="">Выберите филиал</option>
        {branches.filter(branch => !admin.branches.some(assigned => assigned.branchId === branch.branchId)).map((branch) => (
          <option key={branch.branchId} value={branch.branchId}>
            {branch.name}
          </option>
        ))}
      </NativeSelect>
    </FormField>
  </ModalShell>
);

const PasswordResultModal: React.FC<{
  title: string;
  password: string;
  onClose: () => void;
}> = ({ title, password, onClose }) => (
  <ModalShell
    title={title}
    description="Временный пароль показан один раз. Передайте его администратору безопасным способом."
    onClose={onClose}
    maxWidthClassName="max-w-md"
    footer={
      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>
          Готово
        </Button>
      </div>
    }
  >
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <code className="ui-section-title">{password}</code>
    </div>
    <p className="mt-2 text-xs text-rose-600">Повторно этот пароль показан не будет.</p>
  </ModalShell>
);

const ResetPasswordModal: React.FC<{
  admin: AdminView;
  password: string | null;
  loading: boolean;
  onReset: () => void | Promise<void>;
  onClose: () => void;
}> = ({ admin, password, loading, onReset, onClose }) => {
  if (password) {
    return <PasswordResultModal title="Пароль сброшен" password={password} onClose={onClose} />;
  }

  return (
    <ModalShell
      title="Сбросить пароль"
      description={`Для администратора ${admin.firstName} ${admin.lastName} будет создан новый временный пароль.`}
      onClose={onClose}
      closeDisabled={loading}
      maxWidthClassName="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="button" variant="danger" isLoading={loading} onClick={onReset}>
            Сбросить пароль
          </Button>
        </div>
      }
    >
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        После сброса старый пароль перестанет работать. Новый временный пароль нужно сохранить сразу.
      </div>
    </ModalShell>
  );
};

const DeleteAdminModal: React.FC<{
  admin: AdminView;
  value: string;
  onChange: (value: string) => void;
  pending: boolean;
  onClose: () => void;
  onDelete: () => void | Promise<void>;
}> = ({ admin, value, onChange, onClose, onDelete, pending }) => (
  <ModalShell
    title="Удалить администратора"
    description="Это действие нельзя отменить."
    onClose={onClose}
    closeDisabled={pending}
    maxWidthClassName="max-w-md"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" variant="danger" disabled={pending || value !== admin.adminId} onClick={onDelete}>
          Удалить
        </Button>
      </div>
    }
  >
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Чтобы подтвердить удаление, введите ID администратора.
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <code className="text-xs text-slate-700">{admin.adminId}</code>
      </div>
      <FormField label="ID администратора">
        <Input
          type="text"
          placeholder="Введите ID"
          className={formControlClassName}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </FormField>
    </div>
  </ModalShell>
);

export default AdminsPage;
