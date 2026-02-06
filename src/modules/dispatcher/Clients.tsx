import React, { useState, useEffect, useMemo } from 'react';
import { Client, ClientStatus } from '../../shared/types';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { apiRequest, getApiUrl } from '../../shared/api';

const statusLabels: Record<ClientStatus, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  NO_RESPONSE: 'Нет связи',
  REJECTED: 'Отказ',
  TRIAL_SCHEDULED: 'Назначен пробный',
  TRIAL_COMPLETED: 'Пробный проведён',
  TRIAL_FAILED: 'Пробный неудачный',
  CONTRACT_PENDING: 'Оформление договора',
  ACTIVE: 'Активный',
  PAUSED: 'Приостановлен',
  INACTIVE: 'Неактивный',
};


const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadClients = async () => {
      try {
        setError(null);
        const data = await apiRequest(getApiUrl('/api/client/all'));
        setClients(Array.isArray(data) ? data : data?.content ?? []);
      } catch (error) {
        console.error('Failed to fetch clients', error);
        setError('Не удалось загрузить клиентов');
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  const filtered = useMemo(() => {
    return clients.filter((client) => {
      const matchesQuery = client.name.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || client.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [clients, query, statusFilter]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="heading-font text-2xl font-semibold text-dispatcher-700">
          Клиенты
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Управляйте клиентской базой и статусами заявок.
        </p>
      </div>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-2 md:space-y-0">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700" htmlFor="search">
            Поиск
          </label>
          <input
            id="search"
            type="text"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите имя клиента"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700" htmlFor="status">
            Статус
          </label>
          {/* Контейнер с относительным позиционированием для стилизованного select */}
          <div className="relative mt-1">
            <select
              id="status"
              className="block w-full appearance-none bg-white px-3 py-2 pr-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="ALL">Все</option>
              {Object.keys(statusLabels).map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status as ClientStatus]}
                </option>
              ))}
            </select>
            {/* SVG‑стрелка поверх select, не перехватывающая клики */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
      </div>
      <div className="overflow-x-auto glass-card rounded-2xl p-3">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Имя
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Телефон
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    Загрузка клиентов...
                  </td>
                </tr>
              )}
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-dispatcher-100">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {statusLabels[client.status]}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    Нет клиентов, соответствующих критериям
                  </td>
                </tr>
              )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsPage;
