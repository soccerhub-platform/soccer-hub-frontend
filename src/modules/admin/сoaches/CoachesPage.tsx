import React, { useEffect, useMemo, useState } from 'react';
import { PlusIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

import { useAuth } from '../../../shared/AuthContext';
import { useAdminBranch } from '../BranchContext';
import { CoachApi, Coach, CoachStatus, Page } from './coach.api';
import { PageTable } from '../../../shared/components/PageTable';

import CreateCoachModal from './CreateCoachModal';
import toast from 'react-hot-toast';

const CoachesPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [pageData, setPageData] = useState<Page<Coach> | null>(null);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadCoaches = async () => {
    if (!branchId || !token) return;

    setLoading(true);
    try {
      const data = await CoachApi.listByBranch(
        branchId,
        token,
        page,
        size
      );
      setPageData(data);
    } catch (e) {
      console.error('Failed to load coaches', e);
      setPageData(null);
      toast.error('Не удалось загрузить тренеров');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
  }, [branchId]);

  useEffect(() => {
    loadCoaches();
  }, [branchId, page, token]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const filteredPage = useMemo(() => {
    if (!pageData) return null;
    if (statusFilter === 'all') return pageData;
    const active = statusFilter === 'active';
    const filtered = pageData.content.filter((c) => c.active === active);
    return {
      ...pageData,
      content: filtered,
      totalElements: filtered.length,
      totalPages: filtered.length === 0 ? 1 : Math.ceil(filtered.length / pageData.size),
      number: 0,
      first: true,
      last: true,
      empty: filtered.length === 0,
    };
  }, [pageData, statusFilter]);

  const toggleStatus = async (coach: Coach) => {
    if (!token) return;
    const nextStatus: CoachStatus = coach.active ? 'INACTIVE' : 'ACTIVE';
    setUpdatingId(coach.id);
    try {
      await CoachApi.updateStatus(coach.id, nextStatus, token);
      toast.success(coach.active ? 'Тренер отключён' : 'Тренер включён');
      await loadCoaches();
    } catch (e) {
      console.error(e);
      toast.error('Не удалось изменить статус');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!token) {
    return (
      <div className="bg-white p-6 rounded-xl border text-sm text-gray-500">
        Нет авторизации
      </div>
    );
  }

  if (!branchId) {
    return (
      <div className="bg-white p-6 rounded-xl border text-sm text-gray-500">
        Сначала выберите филиал
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="heading-font text-2xl font-semibold text-admin-700">
            Тренеры
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Управление тренерами текущего филиала
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center px-4 py-2 bg-admin-500 text-white rounded-xl hover:bg-admin-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить тренера
        </button>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch">
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

      {/* TABLE */}
      {loading ? (
        <div className="glass-card rounded-2xl p-4 text-sm text-gray-500">
          Загрузка тренеров…
        </div>
      ) : !filteredPage || filteredPage.empty ? (
        <div className="glass-card rounded-2xl p-4 text-sm text-gray-500">
          Тренеры не найдены
        </div>
      ) : (
        <PageTable
          page={filteredPage}
          onPageChange={setPage}
          renderHeader={() => (
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Тренер
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Контакты
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Статус
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">
                Действия
              </th>
            </tr>
          )}
          renderRow={(c) => (
            <tr key={c.id} className="hover:bg-admin-50 transition">
              <td className="px-4 py-3 text-sm">
                <div className="font-medium text-gray-800">
                  {c.firstName} {c.lastName}
                </div>
                <div className="text-xs text-gray-400">ID: {c.id.slice(0, 8)}…</div>
              </td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-col gap-0.5 text-xs text-gray-600">
                  <span className="flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-1 text-gray-400" />
                    {c.email}
                  </span>
                  <span className="flex items-center">
                    <PhoneIcon className="h-4 w-4 mr-1 text-gray-400" />
                    {c.phone}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                    c.active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      : 'bg-rose-50 text-rose-700 border border-rose-100'
                  }`}
                >
                  {c.active ? 'Активен' : 'Отключён'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  disabled={updatingId === c.id}
                  onClick={() => toggleStatus(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm ${
                    c.active
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {updatingId === c.id
                    ? 'Сохранение...'
                    : c.active
                    ? 'Отключить'
                    : 'Включить'}
                </button>
              </td>
            </tr>
          )}
        />
      )}

      {showCreate && (
        <CreateCoachModal
          onClose={() => setShowCreate(false)}
          onCreated={loadCoaches}
        />
      )}
    </div>
  );
};

export default CoachesPage;
