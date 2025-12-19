import React, { useState } from 'react';
import { useAuth } from '../../../shared/AuthContext';
import { CoachApi } from './coach.api';

interface CoachDetailsModalProps {
  coach: any;
  onClose: () => void;
  onUpdated: () => void;
}

const CoachDetailsModal: React.FC<CoachDetailsModalProps> = ({
  coach,
  onClose,
  onUpdated,
}) => {
  const { user } = useAuth();
  const token = user?.accessToken!;

  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);

  const assignBranch = async () => {
    if (!branchId) return;

    setLoading(true);
    try {
      await CoachApi.assignBranch(coach.id, branchId, token);
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  const unassignBranch = async (branchId: string) => {
    if (!window.confirm('Убрать тренера из этого филиала?')) return;

    setLoading(true);
    try {
      await CoachApi.unassignBranch(coach.id, branchId, token);
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-admin-700">
              {coach.firstName} {coach.lastName}
            </h3>
            <p className="text-sm text-gray-500">{coach.email}</p>
            <p className="text-sm text-gray-500">{coach.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* BRANCHES */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Филиалы
          </h4>

          {coach.branches?.length ? (
            <div className="space-y-2">
              {coach.branches.map((b: any) => (
                <div
                  key={b.id}
                  className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded"
                >
                  <span className="text-sm">{b.name}</span>
                  <button
                    onClick={() => unassignBranch(b.id)}
                    className="text-xs text-rose-600 hover:text-rose-800"
                  >
                    Убрать
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Филиалы не назначены</p>
          )}
        </div>

        {/* ASSIGN */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">
            Назначить в филиал
          </label>
          <input
            type="text"
            placeholder="Branch ID"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <button
            disabled={loading}
            onClick={assignBranch}
            className="w-full bg-admin-500 text-white py-2 rounded hover:bg-admin-700 text-sm"
          >
            Назначить
          </button>
        </div>

        {/* FOOTER */}
        <div className="pt-4 border-t text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-50"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoachDetailsModal;