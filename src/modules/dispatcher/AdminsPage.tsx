import React, { useEffect, useMemo, useState } from "react";
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  KeyIcon,
  PencilSquareIcon,
  PhoneIcon,
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";

import { useAuth } from "../../shared/AuthContext";
import { apiClient, getApiErrorMessage } from "../../shared/api";
import {
  formatPhoneInput,
  isValidFormattedPhone,
  normalizePhoneForSubmit,
} from "../../shared/phone";
import {
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

      setAdmins(
        rawAdmins.map((a) => ({
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
        }))
      );
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
    if (!selectedAdmin) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error("Имя и фамилия обязательны");
      return;
    }
    if (!isValidPhone(editForm.phone.trim())) {
      toast.error("Неверный формат телефона");
      return;
    }

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
    }
  };

  const toggleStatus = async (adminId: string, nextActive: boolean) => {
    try {
      await apiClient.patch(`/dispatcher/admin/${adminId}/status`, { active: nextActive });
      toast.success(nextActive ? "Администратор включен" : "Администратор отключен");
      await loadAdmins();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка смены статуса"));
    }
  };

  const openAssignBranchModal = (admin: AdminView) => {
    setSelectedAdmin(admin);
    setAssignBranchId("");
    setShowAssignModal(true);
  };

  const handleAssignBranch = async () => {
    if (!selectedAdmin || !assignBranchId) {
      toast.error("Выберите филиал");
      return;
    }

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
    }
  };

  const handleUnassignBranch = async (adminId: string, branchId: string) => {
    if (!window.confirm("Открепить этот филиал у администратора?")) return;

    try {
      await apiClient.patch(`/dispatcher/admin/${adminId}/unassign-branch`, { branchId });
      toast.success("Филиал откреплен");
      setShowDetailsModal(false);
      setSelectedAdmin(null);
      await loadAdmins();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ошибка открепления филиала"));
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
    if (!selectedAdmin) return;

    if (deleteInput !== selectedAdmin.adminId) {
      toast.error("ID неверный. Удаление не подтверждено.");
      return;
    }

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
    }
  };

  if (!user?.accessToken) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Администраторы"
        description="Создание администраторов и управление доступом к филиалам. Операционные пользователи филиала управляются в разделе «Сотрудники» у администратора филиала."
        actions={
          <Button type="button" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4" />
            Добавить администратора
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard label="Всего" value={totalAdmins} />
        <MetricCard label="Активны" value={activeAdmins} tone="success" />
        <MetricCard label="Без филиала" value={unassignedAdmins} tone={unassignedAdmins ? "warning" : "neutral"} />
      </div>

      <SectionCard>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px]">
          <FormField label="Поиск">
            <input
              type="text"
              placeholder="Имя, email или телефон"
              className={formControlClassName}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </FormField>

          <FormField label="Статус">
            <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              {[
                ["all", "Все"],
                ["active", "Активны"],
                ["inactive", "Отключены"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value as StatusFilter)}
                  className={`flex-1 rounded-lg px-2 py-2 text-xs transition sm:text-sm ${
                    statusFilter === value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </FormField>
        </div>
      </SectionCard>

      <SectionCard>
        {error ? (
          <ErrorState message={error} onRetry={loadAdmins} />
        ) : loading ? (
          <LoadingState label="Загрузка администраторов..." />
        ) : filteredAdmins.length === 0 ? (
          <EmptyState
            title="Администраторы не найдены"
            description="Измените фильтры или добавьте нового администратора."
            action={
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
              >
                Сбросить фильтры
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Администратор
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Контакты
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Филиалы
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-slate-500">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAdmins.map((admin) => (
                  <tr
                    key={admin.adminId}
                    className="transition-colors hover:bg-slate-50"
                    onClick={() => {
                      setSelectedAdmin(admin);
                      setShowDetailsModal(true);
                    }}
                  >
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-xs font-semibold text-cyan-800">
                          {getInitials(admin)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">
                            {admin.firstName} {admin.lastName}
                          </div>
                          <div className="text-xs text-slate-400">ID: {admin.adminId.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <EnvelopeIcon className="h-4 w-4 text-slate-400" />
                          {admin.email || "Email не указан"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <PhoneIcon className="h-4 w-4 text-slate-400" />
                          {admin.phone || "Телефон не указан"}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      <BranchBadges branches={admin.branches} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge active={admin.active} />
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            setDeleteInput("");
            setShowDeleteModal(true);
          }}
          onUnassignBranch={handleUnassignBranch}
        />
      ) : null}

      {showCreateModal ? (
        <CreateAdminModal
          form={createForm}
          branches={branches}
          onChange={setCreateForm}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateAdmin}
        />
      ) : null}

      {showEditModal && selectedAdmin ? (
        <EditAdminModal
          admin={selectedAdmin}
          form={editForm}
          onChange={setEditForm}
          onClose={() => setShowEditModal(false)}
          onSave={handleEditAdmin}
        />
      ) : null}

      {showAssignModal && selectedAdmin ? (
        <AssignBranchModal
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
          admin={selectedAdmin}
          value={deleteInput}
          onChange={setDeleteInput}
          onClose={() => setShowDeleteModal(false)}
          onDelete={handleDeleteAdmin}
        />
      ) : null}
    </PageShell>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning";
}> = ({ label, value, tone = "neutral" }) => {
  const valueClass =
    tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
};

const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
      active
        ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
        : "border border-rose-100 bg-rose-50 text-rose-700"
    }`}
  >
    {active ? "Активен" : "Отключен"}
  </span>
);

const BranchBadges: React.FC<{ branches: BranchAssignment[] }> = ({ branches }) => {
  if (branches.length === 0) {
    return <span className="text-xs text-slate-400">Не привязан к филиалам</span>;
  }

  const firstBranch = branches[0];

  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5 text-xs text-cyan-800">
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
    description={`ID: ${admin.adminId}`}
    onClose={onClose}
    maxWidthClassName="max-w-2xl"
    footer={
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="softDanger" onClick={onDelete}>
          <TrashIcon className="h-4 w-4" />
          Удалить
        </Button>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onEdit}>
            <PencilSquareIcon className="h-4 w-4" />
            Редактировать
          </Button>
          <Button type="button" variant="secondary" onClick={onResetPassword}>
            <KeyIcon className="h-4 w-4" />
            Сбросить пароль
          </Button>
          <Button type="button" variant={admin.active ? "softDanger" : "soft"} onClick={onToggleStatus}>
            {admin.active ? "Отключить" : "Включить"}
          </Button>
        </div>
      </div>
    }
  >
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-sm font-semibold text-cyan-800">
            {getInitials(admin)}
          </div>
          <div>
            <div className="font-semibold text-slate-900">
              {admin.firstName} {admin.lastName}
            </div>
            <div className="text-sm text-slate-500">{admin.email || "Email не указан"}</div>
          </div>
        </div>
        <StatusBadge active={admin.active} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoBox label="Email" value={admin.email || "Не указан"} icon={<EnvelopeIcon className="h-4 w-4" />} />
        <InfoBox label="Телефон" value={admin.phone || "Не указан"} icon={<PhoneIcon className="h-4 w-4" />} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-slate-900">Филиалы</div>
            <div className="text-xs text-slate-500">К каким филиалам у администратора есть доступ</div>
          </div>
          <Button type="button" size="sm" onClick={onAssign}>
            <UserPlusIcon className="h-4 w-4" />
            Назначить
          </Button>
        </div>

        {admin.branches.length === 0 ? (
          <EmptyState
            title="Филиалы не назначены"
            description="Назначьте хотя бы один филиал, чтобы администратор мог работать."
          />
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {admin.branches.map((branch) => (
              <div
                key={branch.branchId}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="h-5 w-5 text-slate-400" />
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
  onClose: () => void;
  onSave: () => void | Promise<void>;
}> = ({ form, branches, onChange, onClose, onSave }) => (
  <ModalShell
    title="Создать администратора"
    description="После создания система покажет временный пароль один раз."
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Email*">
        <input
          type="email"
          placeholder="admin@mail.com"
          className={formControlClassName}
          value={form.email}
          onChange={(event) => onChange({ ...form, email: event.target.value })}
        />
      </FormField>
      <FormField label="Телефон">
        <input
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
        <input
          type="text"
          placeholder="Имя"
          className={formControlClassName}
          value={form.firstName}
          onChange={(event) => onChange({ ...form, firstName: event.target.value })}
        />
      </FormField>
      <FormField label="Фамилия*">
        <input
          type="text"
          placeholder="Фамилия"
          className={formControlClassName}
          value={form.lastName}
          onChange={(event) => onChange({ ...form, lastName: event.target.value })}
        />
      </FormField>
      <FormField label="Филиал*" className="sm:col-span-2">
        <select
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
        </select>
      </FormField>
    </div>
  </ModalShell>
);

const EditAdminModal: React.FC<{
  admin: AdminView;
  form: { firstName: string; lastName: string; phone: string };
  onChange: React.Dispatch<React.SetStateAction<{ firstName: string; lastName: string; phone: string }>>;
  onClose: () => void;
  onSave: () => void | Promise<void>;
}> = ({ admin, form, onChange, onClose, onSave }) => (
  <ModalShell
    title="Редактировать администратора"
    description={`${admin.firstName} ${admin.lastName}`}
    onClose={onClose}
    maxWidthClassName="max-w-lg"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" onClick={onSave}>
          Сохранить
        </Button>
      </div>
    }
  >
    <div className="space-y-4">
      <FormField label="Имя*">
        <input
          type="text"
          className={formControlClassName}
          value={form.firstName}
          onChange={(event) => onChange({ ...form, firstName: event.target.value })}
        />
      </FormField>
      <FormField label="Фамилия*">
        <input
          type="text"
          className={formControlClassName}
          value={form.lastName}
          onChange={(event) => onChange({ ...form, lastName: event.target.value })}
        />
      </FormField>
      <FormField label="Телефон">
        <input
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
  onClose: () => void;
  onSave: () => void | Promise<void>;
}> = ({ admin, branches, branchId, onChange, onClose, onSave }) => (
  <ModalShell
    title="Назначить филиал"
    description={`${admin.firstName} ${admin.lastName}`}
    onClose={onClose}
    maxWidthClassName="max-w-lg"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" onClick={onSave}>
          Сохранить
        </Button>
      </div>
    }
  >
    <FormField label="Филиал">
      <select className={formControlClassName} value={branchId} onChange={(event) => onChange(event.target.value)}>
        <option value="">Выберите филиал</option>
        {branches.map((branch) => (
          <option key={branch.branchId} value={branch.branchId}>
            {branch.name}
          </option>
        ))}
      </select>
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
      <code className="text-sm font-semibold text-slate-900">{password}</code>
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
  onClose: () => void;
  onDelete: () => void | Promise<void>;
}> = ({ admin, value, onChange, onClose, onDelete }) => (
  <ModalShell
    title="Удалить администратора"
    description="Это действие нельзя отменить."
    onClose={onClose}
    maxWidthClassName="max-w-md"
    footer={
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" variant="danger" disabled={value.length === 0} onClick={onDelete}>
          Удалить
        </Button>
      </div>
    }
  >
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Чтобы подтвердить удаление, введите ID администратора.
      </p>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <code className="text-xs text-slate-700">{admin.adminId}</code>
      </div>
      <FormField label="ID администратора">
        <input
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
