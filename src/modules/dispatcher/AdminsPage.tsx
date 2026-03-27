// ============ FULL REDESIGNED AdminsPage.tsx ============

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../shared/AuthContext';
import { getApiUrl } from '../../shared/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
    formatPhoneInput,
    isValidFormattedPhone,
    normalizePhoneForSubmit,
} from '../../shared/phone';

// Интерфейсы соответствуют бэку
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

type StatusFilter = 'all' | 'active' | 'inactive';

const AdminsPage: React.FC = () => {
    const { user } = useAuth();

    const [admins, setAdmins] = useState<AdminView[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);

    const [loading, setLoading] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [createdAdminPassword, setCreatedAdminPassword] = useState<string | null>(null);
    const [showCreatedPasswordModal, setShowCreatedPasswordModal] = useState(false);

    const [selectedAdmin, setSelectedAdmin] = useState<AdminView | null>(null);

    // фильтры
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

    // admin deletion
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');

    // reset password
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [resetPasswordValue, setResetPasswordValue] = useState<string | null>(null);
    const [resetLoading, setResetLoading] = useState(false);

    // форма создания
    const [createForm, setCreateForm] = useState({
        email: '',
        firstName: '',
        lastName: '',
        phone: '',
        assignedBranch: '',
    });

    // форма редактирования
    const [editForm, setEditForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
    });

    // id филиала для назначения
    const [assignBranchId, setAssignBranchId] = useState<string>('');

    const authHeaders: HeadersInit = user?.accessToken
        ? { Authorization: `Bearer ${user.accessToken}` }
        : {};

    const isValidEmail = (value: string) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const isValidPhone = (value: string) =>
        value.length === 0 || isValidFormattedPhone(value);

    // ---------- Загрузка админов ----------
    const loadAdmins = async () => {
        try {
            setLoading(true);
            const res = await fetch(getApiUrl('/dispatcher/admin'), {
                headers: { ...authHeaders },
            });

            const data = await res.json();
            const rawAdmins = data.admins ?? [];

            setAdmins(
                rawAdmins.map((a: any) => ({
                    adminId: a.id,
                    firstName: a.firstName,
                    lastName: a.lastName,
                    email: a.email,
                    phone: a.phone,
                    active: a.isActive ?? a.active,
                    branches: Array.isArray(a.branches)
                        ? a.branches.map((b: any) => ({
                              branchId: b.branchId,
                              branchName: b.branchName,
                              clubId: b.clubId,
                              clubName: b.clubName,
                          }))
                        : [],
                }))
            );
        } catch (error) {
            console.error(error);
            toast.error('Не удалось загрузить администраторов');
        } finally {
            setLoading(false);
        }
    };

    // ---------- Загрузка филиалов ----------
    const loadBranches = async () => {
        try {
            const res = await fetch(getApiUrl('/dispatcher/branch'), {
                headers: { ...authHeaders },
            });
            const data = await res.json();
            const raw = Array.isArray(data) ? data : data.branches ?? [];
            setBranches(raw.map((b: any) => ({ branchId: b.branchId, name: b.name })));
        } catch (error) {
            console.error(error);
            toast.error('Не удалось загрузить филиалы');
        }
    };

    useEffect(() => {
        if (!user?.accessToken) return;
        loadAdmins();
        loadBranches();
    }, [user?.accessToken]);

    // ---------- Derived: фильтрация ----------
    const filteredAdmins = useMemo(() => {
        const term = search.trim().toLowerCase();

        return admins.filter((a) => {
            if (statusFilter === 'active' && !a.active) return false;
            if (statusFilter === 'inactive' && a.active) return false;

            if (!term) return true;

            const fullName = `${a.firstName ?? ''} ${a.lastName ?? ''}`.toLowerCase();
            const email = (a.email ?? '').toLowerCase();
            const phone = (a.phone ?? '').toLowerCase();

            return (
                fullName.includes(term) ||
                email.includes(term) ||
                phone.includes(term)
            );
        });
    }, [admins, search, statusFilter]);

    const totalAdmins = admins.length;
    const activeAdmins = admins.filter((a) => a.active).length;

    // ---------- Создание ----------
    const handleCreateAdmin = async () => {
        if (!createForm.email.trim() || !isValidEmail(createForm.email.trim())) {
            toast.error('Укажите корректный email');
            return;
        }
        if (!createForm.firstName.trim()) {
            toast.error('Имя обязательно');
            return;
        }
        if (!createForm.lastName.trim()) {
            toast.error('Фамилия обязательна');
            return;
        }
        if (!isValidPhone(createForm.phone.trim())) {
            toast.error('Неверный формат телефона');
            return;
        }
        if (!createForm.assignedBranch) {
            toast.error('Выберите филиал');
            return;
        }

        const payload = {
            ...createForm,
            email: createForm.email.trim(),
            firstName: createForm.firstName.trim(),
            lastName: createForm.lastName.trim(),
            phone: normalizePhoneForSubmit(createForm.phone),
        };

        const res = await fetch(getApiUrl('/dispatcher/admin/register'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            toast.error('Ошибка создания администратора');
            return;
        }

        const data = await res.json();
        if (data?.tempPassword) {
            setCreatedAdminPassword(data.tempPassword);
            setShowCreatedPasswordModal(true);
        } else {
            toast.success('Администратор создан');
        }
        
        setShowCreateModal(false);
        setCreateForm({
            email: '',
            firstName: '',
            lastName: '',
            phone: '',
            assignedBranch: '',
        });

        await loadAdmins();
    };

    // ---------- Редактирование ----------
    const openEditModal = (admin: AdminView) => {
        setSelectedAdmin(admin);
        setEditForm({
            firstName: admin.firstName,
            lastName: admin.lastName,
            phone: formatPhoneInput(admin.phone ?? ''),
        });
        setShowEditModal(true);
    };

    const handleEditAdmin = async () => {
        if (!selectedAdmin) return;
        if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
            toast.error('Имя и фамилия обязательны');
            return;
        }
        if (!isValidPhone(editForm.phone.trim())) {
            toast.error('Неверный формат телефона');
            return;
        }

        const res = await fetch(
            getApiUrl(`/dispatcher/admin/${selectedAdmin.adminId}`),
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                    firstName: editForm.firstName.trim(),
                    lastName: editForm.lastName.trim(),
                    phone: normalizePhoneForSubmit(editForm.phone),
                }),
            }
        );

        if (res.ok) {
            setShowEditModal(false);
            setSelectedAdmin(null);
            await loadAdmins();
        } else {
            toast.error('Ошибка сохранения');
        }
    };

    // ---------- Статус ----------
    const toggleStatus = async (adminId: string, nextActive: boolean) => {
        const res = await fetch(
            getApiUrl(`/dispatcher/admin/${adminId}/status`),
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ active: nextActive }),
            }
        );
        if (res.ok) {
            await loadAdmins();
        } else {
            toast.error('Ошибка смены статуса');
        }
    };

    // ---------- Назначить филиал ----------
    const openAssignBranchModal = (admin: AdminView) => {
        setSelectedAdmin(admin);
        setAssignBranchId('');
        setShowAssignModal(true);
    };

    const handleAssignBranch = async () => {
        if (!selectedAdmin || !assignBranchId) {
            toast.error('Выберите филиал');
            return;
        }

        const res = await fetch(
            getApiUrl(`/dispatcher/admin/${selectedAdmin.adminId}/assign-branch`),
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ branchId: assignBranchId }),
            }
        );

        if (res.ok) {
            setShowAssignModal(false);
            setSelectedAdmin(null);
            await loadAdmins();
        } else {
            toast.error('Ошибка назначения филиала');
        }
    };

    // ---------- Открепить филиал от админа ----------
    const handleUnassignBranch = async (adminId: string, branchId: string) => {
        if (!window.confirm('Открепить этот филиал у администратора?')) return;

        const res = await fetch(
            getApiUrl(`/dispatcher/admin/${adminId}/unassign-branch`),
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ branchId }),
            }
        );

        if (res.ok) {
            // Закрываем модалку, обновляем список
            setShowDetailsModal(false);
            setSelectedAdmin(null);
            await loadAdmins();
        } else {
            toast.error('Ошибка открепления филиала');
        }
    };

    const handleResetPassword = async () => {
        if (!selectedAdmin) return;

        setResetLoading(true);
        try {
            const res = await fetch(
            getApiUrl(`/dispatcher/admin/${selectedAdmin.adminId}/reset-password`),
            {
                method: 'POST',
                headers: { ...authHeaders },
            }
            );

            if (!res.ok) {
            throw new Error();
            }

            const data = await res.json();
            setResetPasswordValue(data.temporaryPassword);
        } catch {
            toast.error('Ошибка сброса пароля');
            setShowResetPasswordModal(false);
        } finally {
            setResetLoading(false);
        }
    };

    // ---------- Удаление админа --------------
    const handleDeleteAdmin = async () => {
        if (!selectedAdmin) return;

        if (deleteInput !== selectedAdmin.adminId) {
            toast.error("ID неверный. Удаление не подтверждено.");
            return;
        }

        const res = await fetch(
            getApiUrl(`/dispatcher/admin/${selectedAdmin.adminId}`),
            {
                method: 'DELETE',
                headers: { ...authHeaders }
            }
        );

        if (res.ok) {
            setShowDeleteModal(false);
            setShowDetailsModal(false);
            setSelectedAdmin(null);
            setDeleteInput('');
            await loadAdmins();
        } else {
            toast.error("Ошибка удаления администратора");
        }
    };

    // ---------- Helpers ----------
    const getInitials = (admin: AdminView) => {
        const f = admin.firstName?.[0] ?? '';
        const l = admin.lastName?.[0] ?? '';
        return (f + l).toUpperCase();
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="heading-font text-2xl font-bold text-gray-900 tracking-tight">
                        Администраторы
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Управляйте доступом администраторов и привязкой к филиалам.
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-700 transition"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Добавить администратора
                </button>
            </div>

            {/* STATS + FILTERS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Статистика */}
                <div className="col-span-1 flex gap-4">
                    <div className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm px-4 py-3">
                        <div className="text-xs font-medium text-gray-500 uppercase">
                            Всего администраторов
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                            {totalAdmins}
                        </div>
                    </div>
                    <div className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-sm px-4 py-3">
                        <div className="text-xs font-medium text-gray-500 uppercase">
                            Активны
                        </div>
                        <div className="mt-1 text-2xl font-semibold text-emerald-600">
                            {activeAdmins}
                        </div>
                    </div>
                </div>

                {/* Поиск */}
                <div className="col-span-1 lg:col-span-2 flex flex-col sm:flex-row gap-3 items-stretch">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Поиск по имени, email или телефону
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Например: Алексей, +7701..., mail@example.com"
                                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="sm:w-56">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                            Статус
                        </label>
                        <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-0.5">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`flex-1 text-xs sm:text-sm px-2 py-1.5 rounded-lg transition ${
                                    statusFilter === 'all'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Все
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('active')}
                                className={`flex-1 text-xs sm:text-sm px-2 py-1.5 rounded-lg transition ${
                                    statusFilter === 'active'
                                        ? 'bg-white text-emerald-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Активны
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('inactive')}
                                className={`flex-1 text-xs sm:text-sm px-2 py-1.5 rounded-lg transition ${
                                    statusFilter === 'inactive'
                                        ? 'bg-white text-rose-700 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                }`}
                            >
                                Отключены
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE / LIST */}
            <div className="bg-white/80 backdrop-blur-sm shadow-md rounded-2xl p-5 border border-gray-100">
                {loading ? (
                    <div className="text-sm text-gray-500">Загрузка администраторов...</div>
                ) : filteredAdmins.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="text-4xl mb-2">😶‍🌫️</div>
                        <p className="text-sm text-gray-500">
                            По текущим фильтрам администраторы не найдены.
                        </p>
                        <button
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('all');
                            }}
                            className="mt-3 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                            Сбросить фильтры
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Администратор
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Контакты
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Филиалы
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Статус
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredAdmins.map((a) => {
                                    const branchesCount = a.branches.length;
                                    const firstBranch = a.branches[0];

                                    return (
                                        <tr
                                            key={a.adminId}
                                            className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                                            onClick={() => {
                                                setSelectedAdmin(a);
                                                setShowDetailsModal(true);
                                            }}
                                        >
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
                                                        {getInitials(a)}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">
                                                            {a.firstName} {a.lastName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            ID: {a.adminId.slice(0, 8)}…
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                <div className="flex flex-col gap-0.5">
                                                    <span>{a.email || '—'}</span>
                                                    <span className="text-xs text-gray-500">
                                                        {a.phone || 'Телефон не указан'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {branchesCount === 0 && (
                                                    <span className="text-xs text-gray-400">
                                                        Не привязан к филиалам
                                                    </span>
                                                )}
                                                {branchesCount > 0 && (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {firstBranch && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                {firstBranch.branchName}
                                                            </span>
                                                        )}
                                                        {branchesCount > 1 && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                                                + ещё {branchesCount - 1}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <span
                                                    className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                        a.active
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                                                    }`}
                                                >
                                                    {a.active ? 'Активен' : 'Отключён'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* DETAILS MODAL */}
            {showDetailsModal && selectedAdmin && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    onClick={() => {
                        setShowDetailsModal(false);
                        setSelectedAdmin(null);
                    }}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-7 border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold">
                                    {getInitials(selectedAdmin)}
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        {selectedAdmin.firstName} {selectedAdmin.lastName}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        ID: {selectedAdmin.adminId}
                                    </p>
                                </div>
                            </div>

                            <button
                                className="text-gray-400 text-2xl leading-none hover:text-gray-600"
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    setSelectedAdmin(null);
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Status tag */}
                        <div className="mt-3">
                            <span
                                className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                    selectedAdmin.active
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}
                            >
                                {selectedAdmin.active ? 'Активен' : 'Отключён'}
                            </span>
                        </div>

                        {/* Info Section */}
                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-xs font-medium text-gray-500 uppercase">
                                    Email
                                </p>
                                <p className="mt-1 font-medium text-gray-800">
                                    {selectedAdmin.email || '—'}
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-xs font-medium text-gray-500 uppercase">
                                    Телефон
                                </p>
                                <p className="mt-1 font-medium text-gray-800">
                                    {selectedAdmin.phone || '—'}
                                </p>
                            </div>
                        </div>

                        {/* Branches */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-800 text-sm">
                                    Филиалы ({selectedAdmin.branches.length})
                                </h4>
                            </div>

                            {selectedAdmin.branches.length === 0 ? (
                                <p className="text-sm text-gray-500 mt-2">
                                    Администратор пока не привязан ни к одному филиалу.
                                </p>
                            ) : (
                                <div className="space-y-2 mt-3 max-h-60 overflow-y-auto pr-1">
                                    {selectedAdmin.branches.map((b) => (
                                        <div
                                            key={b.branchId}
                                            className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-200"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">
                                                    {b.branchName}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {b.clubName || 'Клуб не указан'}
                                                </p>
                                            </div>
                                            <button
                                                className="text-xs font-medium text-rose-600 hover:text-rose-800"
                                                onClick={() =>
                                                    handleUnassignBranch(
                                                        selectedAdmin.adminId,
                                                        b.branchId
                                                    )
                                                }
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    openAssignBranchModal(selectedAdmin);
                                }}
                                className="mt-3 w-full bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 text-sm font-medium shadow-sm"
                            >
                                + Назначить филиал
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="space-y-2 mt-6 border-t pt-4">
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    openEditModal(selectedAdmin);
                                }}
                                className="w-full py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm"
                            >
                                ✏️ Редактировать данные
                            </button>

                            <button
                                onClick={() => {
                                    toggleStatus(selectedAdmin.adminId, !selectedAdmin.active);
                                    setShowDetailsModal(false);
                                }}
                                className={`w-full py-2.5 rounded-xl text-sm font-medium text-white shadow-sm ${
                                    selectedAdmin.active
                                        ? 'bg-yellow-500 hover:bg-yellow-600'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {selectedAdmin.active ? '⛔ Отключить' : '✔️ Включить'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDetailsModal(false);
                                    setShowResetPasswordModal(true);
                                }}
                                className="w-full py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium shadow-sm"
                            >
                                🔐 Сбросить пароль
                            </button>
                            <button
                                onClick={() => {
                                    setDeleteInput('');
                                    setShowDeleteModal(true);
                                }}
                                className="w-full py-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 text-sm font-medium shadow-sm"
                            >
                                🗑 Удалить администратора
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN BRANCH MODAL */}
            {showAssignModal && selectedAdmin && (
                <div
                    className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
                    onClick={() => setShowAssignModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-gray-900">
                            Назначить филиал
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Администратор: {selectedAdmin.firstName} {selectedAdmin.lastName}
                        </p>

                        <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Филиал
                            </label>
                            <select
                                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={assignBranchId}
                                onChange={(e) => setAssignBranchId(e.target.value)}
                            >
                                <option value="">Выберите филиал</option>
                                {branches.map((b) => (
                                    <option key={b.branchId} value={b.branchId}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end space-x-2 mt-5">
                            <button
                                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => setShowAssignModal(false)}
                            >
                                Отмена
                            </button>

                            <button
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm"
                                onClick={handleAssignBranch}
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {showEditModal && selectedAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
                        
                        <h3 className="text-lg font-semibold text-gray-900">
                            Редактировать администратора
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            {selectedAdmin.firstName} {selectedAdmin.lastName}
                        </p>

                        <div className="space-y-4 mt-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Имя
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm
                                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                                            transition"
                                    placeholder="Имя"
                                    value={editForm.firstName}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, firstName: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Фамилия*
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm
                                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                                            transition"
                                    placeholder="Фамилия"
                                    value={editForm.lastName}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, lastName: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Телефон
                                </label>
                                <input
                                    type="tel"
                                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm
                                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                                            transition"
                                    placeholder="+7 777 123 45 67"
                                    value={editForm.phone}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, phone: formatPhoneInput(e.target.value) })
                                    }
                                    inputMode="tel"
                                    autoComplete="tel"
                                    maxLength={16}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-6">
                            <button
                                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm 
                                        text-gray-700 hover:bg-gray-50 transition"
                                onClick={() => setShowEditModal(false)}
                            >
                                Отмена
                            </button>

                            <button
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium
                                        shadow-sm hover:bg-blue-700 transition"
                                onClick={handleEditAdmin}
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-gray-100">
                        <h3 className="text-lg font-semibold text-gray-900">
                            Создать администратора
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Email*
                                </label>
                                <input
                                    type="email"
                                    placeholder="admin@mail.com"
                                    className="border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={createForm.email}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, email: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Телефон
                                </label>
                                <input
                                    type="tel"
                                    placeholder="+7 777 123 45 67"
                                    className="border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={createForm.phone}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, phone: formatPhoneInput(e.target.value) })
                                    }
                                    inputMode="tel"
                                    autoComplete="tel"
                                    maxLength={16}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Имя*
                                </label>
                                <input
                                    type="text"
                                    placeholder="Имя"
                                    className="border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={createForm.firstName}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, firstName: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    Фамилия
                                </label>
                                <input
                                    type="text"
                                    placeholder="Фамилия"
                                    className="border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={createForm.lastName}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, lastName: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                                <label className="text-xs font-medium text-gray-500">
                                    Филиал*
                                </label>
                                <select
                                    className="border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    value={createForm.assignedBranch}
                                    onChange={(e) =>
                                        setCreateForm({
                                            ...createForm,
                                            assignedBranch: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Выберите филиал</option>
                                    {branches.map((b) => (
                                        <option key={b.branchId} value={b.branchId}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 mt-5">
                            <button
                                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Отмена
                            </button>

                            <button
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-sm"
                                onClick={handleCreateAdmin}
                            >
                                Создать
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreatedPasswordModal && createdAdminPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Администратор создан
                    </h3>

                    <p className="text-sm text-gray-600 mt-2">
                        Временный пароль (показан <b>один раз</b>):
                    </p>

                    <div className="mt-3 bg-gray-100 border border-gray-200 rounded-xl p-3">
                        <code className="text-sm font-semibold text-gray-900">
                        {createdAdminPassword}
                        </code>
                    </div>

                    <p className="text-xs text-rose-600 mt-2">
                        Сохраните пароль сейчас. Повторно он показан не будет.
                    </p>

                    <div className="flex justify-end mt-6">
                        <button
                        onClick={() => {
                            setShowCreatedPasswordModal(false);
                            setCreatedAdminPassword(null);
                        }}
                        className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium"
                        >
                        Готово
                        </button>
                    </div>
                    </div>
                </div>
            )}

            {showResetPasswordModal && selectedAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div
                    className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100"
                    onClick={(e) => e.stopPropagation()}
                    >
                    <h3 className="text-lg font-semibold text-gray-900">
                        Сброс пароля администратора
                    </h3>

                    {!resetPasswordValue ? (
                        <>
                        <p className="text-sm text-gray-600 mt-2">
                            Будет создан временный пароль. Все активные сессии администратора будут завершены.
                        </p>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                            onClick={() => setShowResetPasswordModal(false)}
                            >
                            Отмена
                            </button>

                            <button
                            onClick={handleResetPassword}
                            disabled={resetLoading}
                            className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"
                            >
                            {resetLoading ? 'Сброс...' : 'Сбросить пароль'}
                            </button>
                        </div>
                        </>
                    ) : (
                        <>
                        <p className="text-sm text-gray-600 mt-2">
                            Временный пароль (показан один раз):
                        </p>

                        <div className="mt-3 bg-gray-100 border border-gray-200 rounded-xl p-3">
                            <code className="text-sm font-semibold text-gray-900">
                            {resetPasswordValue}
                            </code>
                        </div>

                        <p className="text-xs text-rose-600 mt-2">
                            Сохраните пароль сейчас. Повторно он показан не будет.
                        </p>

                        <div className="flex justify-end mt-6">
                            <button
                            onClick={() => {
                                setShowResetPasswordModal(false);
                                setResetPasswordValue(null);
                                setSelectedAdmin(null);
                            }}
                            className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium"
                            >
                            Готово
                            </button>
                        </div>
                        </>
                    )}
                    </div>
                </div>
            )}

            {showDeleteModal && selectedAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    onClick={() => setShowDeleteModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-gray-900">
                            Подтверждение удаления
                        </h3>

                        <p className="text-sm text-gray-600 mt-2">
                            Это действие <span className="font-semibold text-rose-600">невозможно отменить</span>.
                            Чтобы удалить администратора, введите его ID:
                        </p>

                        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3">
                            <code className="text-xs text-gray-700">{selectedAdmin.adminId}</code>
                        </div>

                        <input
                            type="text"
                            placeholder="Введите ID администратора"
                            className="mt-4 w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm
                                    focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                            value={deleteInput}
                            onChange={(e) => setDeleteInput(e.target.value)}
                        />

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Отмена
                            </button>

                            <button
                                onClick={handleDeleteAdmin}
                                className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 shadow-sm"
                                disabled={deleteInput.length === 0}
                            >
                                Удалить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminsPage;

// ============================================================
