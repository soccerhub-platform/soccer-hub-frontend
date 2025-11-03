import React, { useState } from 'react';
import { Client, ClientStatus } from '../../shared/types';

const SAMPLE_CLIENTS: Client[] = [
  { id: '1', name: 'Иван Иванов', phone: '+77010000001', status: 'NEW' },
  { id: '2', name: 'Алла Петрова', phone: '+77010000002', status: 'CONTACTED' },
  { id: '3', name: 'Борис Сидоров', phone: '+77010000003', status: 'QUALIFIED' },
  { id: '4', name: 'Диана Смирнова', phone: '+77010000004', status: 'CLIENT' },
];

const statusLabels: Record<ClientStatus, string> = {
  NEW: 'Новый',
  CONTACTED: 'Связались',
  QUALIFIED: 'Квалифицирован',
  CONVERTED: 'Конвертирован',
  REJECTED: 'Отклонён',
  CLIENT: 'Клиент',
};

const ClientsPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'ALL'>('ALL');

  const filtered = SAMPLE_CLIENTS.filter((client) => {
    const matchesQuery = client.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || client.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div>
      <h2 className="text-xl font-bold text-dispatcher-700 mb-4">Клиенты</h2>
      <div className="flex flex-col md:flex-row md:items-end md:space-x-4 mb-4 space-y-2 md:space-y-0">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700" htmlFor="search">Поиск</label>
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
          <label className="block text-sm font-medium text-gray-700" htmlFor="status">Статус</label>
          <select
            id="status"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-dispatcher-500 focus:border-dispatcher-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">Все</option>
            {Object.keys(statusLabels).map((status) => (
              <option key={status} value={status}>{statusLabels[status as ClientStatus]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Имя</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Телефон</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((client) => (
              <tr key={client.id} className="hover:bg-dispatcher-100">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{client.phone}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{statusLabels[client.status]}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Нет клиентов, соответствующих критериям</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientsPage;