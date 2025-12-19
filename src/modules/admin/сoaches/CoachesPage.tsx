import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import { PlusIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

import { CoachApi, Coach, Page } from './coach.api';
import { PageTable } from '../../../shared/components/PageTable';

import CreateCoachModal from './CreateCoachModal';
import CoachDetailsModal from './CoachDetailsModal';

/* ================= TYPES ================= */

interface Branch {
  branchId: string;
  name: string;
  address?: string;
  clubId: string;
}

/* ================= PAGE ================= */

const CoachesPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken!;

  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');

  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [pageData, setPageData] = useState<Page<Coach> | null>(null);

  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  /* ---------- LOAD BRANCHES ---------- */
  const loadBranches = async () => {
    try {
      const res = await fetch('http://localhost:8080/admin/branch', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBranches(data?.branches ?? []);
    } catch (e) {
      console.error('Failed to load branches', e);
      setBranches([]);
    }
  };

  /* ---------- LOAD COACHES (PAGEABLE) ---------- */
  const loadCoaches = async () => {
    if (!selectedBranch) {
      setPageData(null);
      return;
    }

    setLoading(true);
    try {
      const data = await CoachApi.listByBranch(
        selectedBranch,
        token,
        page,
        size
      );
      setPageData(data);
    } catch (e) {
      console.error('Failed to load coaches', e);
      setPageData(null);
    } finally {
      setLoading(false);
    }
  };

  /* ---------- EFFECTS ---------- */
  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    setPage(0); // reset page when branch changes
  }, [selectedBranch]);

  useEffect(() => {
    loadCoaches();
  }, [selectedBranch, page]);

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-admin-700">Тренеры</h2>
          <p className="text-sm text-gray-500 mt-1">
            Управление тренерами по филиалам
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

      {/* FILTER */}
      <div className="bg-white p-4 rounded-xl shadow-sm border">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Филиал
        </label>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm
                     focus:outline-none focus:ring-2 focus:ring-admin-500 focus:border-admin-500"
        >
          <option value="">Выберите филиал</option>
          {branches.map((b) => (
            <option key={b.branchId} value={b.branchId}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      {loading ? (
        <div className="bg-white p-4 rounded-xl border text-sm text-gray-500">
          Загрузка тренеров…
        </div>
      ) : !pageData || pageData.empty ? (
        <div className="bg-white p-4 rounded-xl border text-sm text-gray-500">
          Тренеры не найдены
        </div>
      ) : (
        <PageTable
          page={pageData}
          onPageChange={setPage}
          renderHeader={() => (
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Тренер
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                Контакты
              </th>
            </tr>
          )}
          renderRow={(c) => (
            <tr
              key={c.id}
              onClick={() => setSelectedCoach(c)}
              className="hover:bg-admin-100 cursor-pointer transition"
            >
              <td className="px-4 py-3 text-sm font-medium text-gray-800">
                {c.firstName} {c.lastName}
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
            </tr>
          )}
        />
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <CreateCoachModal
          onClose={() => setShowCreate(false)}
          onCreated={loadCoaches}
        />
      )}

      {/* DETAILS MODAL */}
      {selectedCoach && (
        <CoachDetailsModal
          coach={selectedCoach}
          onClose={() => setSelectedCoach(null)}
          onUpdated={loadCoaches}
        />
      )}
    </div>
  );
};

export default CoachesPage;