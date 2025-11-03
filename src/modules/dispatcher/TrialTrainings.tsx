import React, { useState } from 'react';
import { TrialTraining, TrialTrainingStatus } from '../../shared/types';

const SAMPLE_TRAININGS: TrialTraining[] = [
  { id: '1', clientId: '1', date: '2025-11-05T15:00:00', status: 'SCHEDULED' },
  { id: '2', clientId: '2', date: '2025-11-06T16:00:00', status: 'COMPLETED' },
  { id: '3', clientId: '3', date: '2025-11-07T14:00:00', status: 'CANCELLED' },
  { id: '4', clientId: '4', date: '2025-11-08T10:00:00', status: 'SCHEDULED' },
];

const statusLabels: Record<TrialTrainingStatus, string> = {
  SCHEDULED: 'Запланирована',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
  NO_SHOW: 'Не пришел',
};

const TrialTrainingsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<TrialTrainingStatus | 'ALL'>('ALL');
  
  const filtered = SAMPLE_TRAININGS.filter((training) => {
    return statusFilter === 'ALL' || training.status === statusFilter;
  });

  const formatDate = (iso: string) => {
    const dt = new Date(iso);
    return dt.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-dispatcher-700 mb-4">Пробные тренировки</h2>
      <div className="mb-4 max-w-xs">
        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700">Статус</label>
        <select
          id="statusFilter"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="ALL">Все</option>
          {Object.keys(statusLabels).map((status) => (
            <option key={status} value={status}>{statusLabels[status as TrialTrainingStatus]}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Клиент ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((training) => (
              <tr key={training.id} className="hover:bg-dispatcher-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(training.date)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{training.clientId}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{statusLabels[training.status]}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Нет записей</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrialTrainingsPage;