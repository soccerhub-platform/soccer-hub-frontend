import React, { useEffect, useState } from 'react';
import { useAuth } from '../../shared/AuthContext';
import { PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

interface AdminView {
    adminId: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    clubId: string;
    clubName?: string;
    branchId: string;
    branchName?: string;
    active: boolean;
}

interface BranchOption {
    branchId: string;
    name: string;
}

const AdminsPage: React.FC = () => {
    const { user } = useAuth();

    const [admins, setAdmins] = useState<AdminView[]>([]);
    const [branches, setBranches] = useState<BranchOption[]>([]);

    const [loading, setLoading] = useState(false);
    const [loadingBranches, setLoadingBranches] = useState(false);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);

    const [selectedAdmin, setSelectedAdmin] = useState<AdminView | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

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

    // форма смены филиала
    const [assignBranchId, setAssignBranchId] = useState<string>('');

    const authHeaders: Record<string, string> = user?.accessToken
        ? { Authorization: `Bearer ${user.accessToken}` }
        : {};

    // ---- загрузка админов ----
    const loadAdmins = async () => {
        try {
            setLoading(true);
            const res = await fetch('http://localhost:8080/dispatcher/admin', {
                headers: {
                    ...authHeaders,
                },
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

                    clubId: a.club?.id ?? '',
                    clubName: a.club?.name ?? '',

                    branchId: a.branch?.id ?? '',
                    branchName: a.branch?.name ?? ''
                }))
            );
        } catch (e) {
            console.error('Failed to load admins', e);
        } finally {
            setLoading(false);
        }
    };

    // ---- загрузка филиалов ----
    const loadBranches = async () => {
        try {
            setLoadingBranches(true);
            const res = await fetch('http://localhost:8080/dispatcher/branch', {
                headers: {
                    ...authHeaders,
                },
            });

            const data = await res.json();
            const rawBranches: any[] = Array.isArray(data)
                ? data
                : (data?.branches ?? []);

            setBranches(
                rawBranches.map((b) => ({
                    branchId: b.branchId,
                    name: b.name,
                }))
            );
        } catch (e) {
            console.error('Failed to load branches', e);
        } finally {
            setLoadingBranches(false);
        }
    };

    // начальная загрузка
    useEffect(() => {
        if (!user?.accessToken) return;
        loadAdmins();
        loadBranches();
    }, [user?.accessToken]);

    // ---- создание администратора ----
    const handleCreateAdmin = async () => {
        try {
            const res = await fetch('http://localhost:8080/dispatcher/admin/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...authHeaders,
                },
                body: JSON.stringify(createForm),
            });

            if (!res.ok) {
                alert('Ошибка создания администратора');
                return;
            }

            await res.json().catch(() => null);

            setShowCreateModal(false);
            setCreateForm({
                email: '',
                firstName: '',
                lastName: '',
                phone: '',
                assignedBranch: '',
            });

            await loadAdmins();
        } catch (e) {
            console.error('Failed to create admin', e);
        }
    };

    // ---- смена статуса ----
    const toggleStatus = async (adminId: string, nextActive: boolean) => {
        try {
            const res = await fetch(
                `http://localhost:8080/dispatcher/admin/${adminId}/status`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders,
                    },
                    body: JSON.stringify({ active: nextActive }),
                }
            );

            if (!res.ok) {
                alert('Ошибка изменения статуса');
                return;
            }

            await res.json().catch(() => null);
            await loadAdmins();
        } catch (e) {
            console.error('Failed to change status', e);
        }
    };

    // ---- удаление ----
    const handleDeleteAdmin = async (adminId: string) => {
        if (!window.confirm('Удалить администратора?')) return;

        try {
            const res = await fetch(
                `http://localhost:8080/dispatcher/admin/${adminId}`,
                {
                    method: 'DELETE',
                    headers: {
                        ...authHeaders,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!res.ok) {
                alert('Ошибка удаления администратора');
                return;
            }

            await res.json().catch(() => null);
            await loadAdmins();
        } catch (e) {
            console.error('Failed to delete admin', e);
        }
    };

    // ---- открыть модалку редактирования ----
    const openEditModal = (admin: AdminView) => {
        setSelectedAdmin(admin);
        setEditForm({
            firstName: admin.firstName,
            lastName: admin.lastName,
            phone: admin.phone ?? '',
        });
        setShowEditModal(true);
    };

    // ---- редактирование администратора ----
    const handleEditAdmin = async () => {
        if (!selectedAdmin) return;

        try {
            const res = await fetch(
                `http://localhost:8080/dispatcher/admin/${selectedAdmin.adminId}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders,
                    },
                    body: JSON.stringify(editForm),
                }
            );

            if (!res.ok) {
                alert('Ошибка сохранения изменений');
                return;
            }

            await res.json().catch(() => null);
            setShowEditModal(false);
            setSelectedAdmin(null);
            await loadAdmins();
        } catch (e) {
            console.error('Failed to edit admin', e);
        }
    };

    // ---- открыть модалку смены филиала ----
    const openAssignBranchModal = (admin: AdminView) => {
        setSelectedAdmin(admin);
        setAssignBranchId(admin.branchId);
        setShowAssignModal(true);
    };

    // ---- смена филиала ----
    const handleAssignBranch = async () => {
        if (!selectedAdmin || !assignBranchId) return;

        try {
            const res = await fetch(
                `http://localhost:8080/dispatcher/admin/${selectedAdmin.adminId}/assign-branch`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        ...authHeaders,
                    },
                    body: JSON.stringify({ branchId: assignBranchId }),
                }
            );

            if (!res.ok) {
                alert('Ошибка смены филиала');
                return;
            }

            await res.json().catch(() => null);
            setShowAssignModal(false);
            setSelectedAdmin(null);
            await loadAdmins();
        } catch (e) {
            console.error('Failed to assign branch', e);
        }
    };

    return (
        <div className="space-y-6">
            {/* header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-dispatcher-700">Администраторы филиалов</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700 transition-colors"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Добавить администратора
                </button>
            </div>

            {/* table */}
            <div className="bg-white shadow rounded-lg p-4">
                {loading ? (
                    <div className="text-sm text-gray-500">Загрузка администраторов...</div>
                ) : admins.length === 0 ? (
                    <div className="text-sm text-gray-500">
                        Пока нет администраторов. Создайте первого.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Имя
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Email
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Телефон
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Клуб
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Филиал
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Статус
                                    </th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {admins.map((a) => (
                                    <tr key={a.adminId}
                                        className="hover:bg-dispatcher-50 cursor-pointer"
                                        onClick={() => {
                                            setSelectedAdmin(a);
                                            setShowDetailsModal(true);
                                        }}
                                    >
                                        <td className="px-4 py-3 text-sm">
                                            {a.firstName} {a.lastName}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.email}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.phone}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.clubName}</td>
                                        <td className="px-4 py-3 text-sm text-gray-700">{a.branchName}</td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${a.active
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {a.active ? 'Активен' : 'Отключён'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-dispatcher-700">
                                Добавить администратора
                            </h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">Email*</label>
                                <input
                                    type="email"
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    value={createForm.email}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, email: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">Телефон</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    value={createForm.phone}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, phone: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">Имя*</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    value={createForm.firstName}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, firstName: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">Фамилия</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    value={createForm.lastName}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, lastName: e.target.value }))
                                    }
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-xs text-gray-600">Филиал*</label>
                                <select
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    value={createForm.assignedBranch}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, assignedBranch: e.target.value }))
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

                        <div className="flex justify-end space-x-2 pt-2">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm border rounded-md"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleCreateAdmin}
                                className="px-4 py-2 text-sm bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700"
                            >
                                Создать
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {showEditModal && selectedAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-dispatcher-700">
                                Редактировать администратора
                            </h3>
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedAdmin(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">Имя</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    value={editForm.firstName}
                                    onChange={(e) =>
                                        setEditForm((f) => ({ ...f, firstName: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">Фамилия</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    value={editForm.lastName}
                                    onChange={(e) =>
                                        setEditForm((f) => ({ ...f, lastName: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-600">Телефон</label>
                                <input
                                    type="text"
                                    className="w-full border rounded px-3 py-2 text-sm"
                                    value={editForm.phone}
                                    onChange={(e) =>
                                        setEditForm((f) => ({ ...f, phone: e.target.value }))
                                    }
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedAdmin(null);
                                }}
                                className="px-4 py-2 text-sm border rounded-md"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleEditAdmin}
                                className="px-4 py-2 text-sm bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ASSIGN BRANCH MODAL */}
            {showAssignModal && selectedAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-dispatcher-700">
                                Сменить филиал
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedAdmin(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="text-sm text-gray-700">
                                Администратор:{' '}
                                <span className="font-semibold">
                                    {selectedAdmin.firstName} {selectedAdmin.lastName}
                                </span>
                            </div>

                            <label className="text-xs text-gray-600">Новый филиал</label>
                            <select
                                className="w-full border rounded px-3 py-2 text-sm"
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

                        <div className="flex justify-end space-x-2 pt-2">
                            <button
                                onClick={() => {
                                    setShowAssignModal(false);
                                    setSelectedAdmin(null);
                                }}
                                className="px-4 py-2 text-sm border rounded-md"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleAssignBranch}
                                className="px-4 py-2 text-sm bg-dispatcher-500 text-white rounded-md hover:bg-dispatcher-700"
                            >
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILS MODAL */}
            {showDetailsModal && selectedAdmin && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fadeIn"
                    onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedAdmin(null);
                    }}
                >
                    <div
                    className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 space-y-6 animate-slideUp"
                    onClick={(e) => e.stopPropagation()}
                    >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-dispatcher-500 text-white rounded-full flex items-center justify-center text-lg font-semibold">
                            {selectedAdmin.firstName[0]}
                            {selectedAdmin.lastName ? selectedAdmin.lastName[0] : ''}
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800">
                            {selectedAdmin.firstName} {selectedAdmin.lastName}
                            </h3>
                            <p className="text-sm text-gray-500">{selectedAdmin.email}</p>
                        </div>
                        </div>

                        <button
                        onClick={() => {
                            setShowDetailsModal(false);
                            setSelectedAdmin(null);
                        }}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                        ✕
                        </button>
                    </div>

                    {/* Status */}
                    <div className="flex justify-start">
                        <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                            selectedAdmin.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                        >
                        {selectedAdmin.active ? 'Активен' : 'Отключён'}
                        </span>
                    </div>

                    {/* Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                        <p className="text-gray-500">Телефон</p>
                        <p className="font-medium text-gray-800">
                            {selectedAdmin.phone || '—'}
                        </p>
                        </div>

                        <div>
                        <p className="text-gray-500">Клуб</p>
                        <p className="font-medium text-gray-800">
                            {selectedAdmin.clubName || '—'}
                        </p>
                        </div>

                        <div>
                        <p className="text-gray-500">Филиал</p>
                        <p className="font-medium text-gray-800">
                            {selectedAdmin.branchName || '—'}
                        </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-3">
                        <button
                        onClick={() => {
                            setShowDetailsModal(false);
                            openEditModal(selectedAdmin);
                        }}
                        className="w-full py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition"
                        >
                        ✏️ Редактировать
                        </button>

                        <button
                        onClick={() => {
                            setShowDetailsModal(false);
                            openAssignBranchModal(selectedAdmin);
                        }}
                        className="w-full py-2 bg-indigo-500 text-white font-medium rounded-md hover:bg-indigo-600 transition"
                        >
                        🏢 Сменить филиал
                        </button>

                        <button
                        onClick={() => {
                            toggleStatus(selectedAdmin.adminId, !selectedAdmin.active);
                            setShowDetailsModal(false);
                        }}
                        className={`w-full py-2 text-white font-medium rounded-md transition ${
                            selectedAdmin.active
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                        >
                        {selectedAdmin.active ? '⛔ Отключить' : '✔️ Включить'}
                        </button>

                        <button
                        onClick={() => {
                            handleDeleteAdmin(selectedAdmin.adminId);
                            setShowDetailsModal(false);
                        }}
                        className="w-full py-2 bg-red-500 text-white font-medium rounded-md hover:bg-red-600 transition"
                        >
                        🗑 Удалить
                        </button>
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminsPage;