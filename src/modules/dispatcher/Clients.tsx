import React, { useState, useEffect, useMemo } from 'react';
import {
  Client, ClientStatus } from '../../shared/types';
import { ChevronDown } from 'lucide-react';
import { apiRequest, getApiUrl } from '../../shared/api';
import { NativeSelect, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow   } from '../../shared/ui';

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
        const data = await apiRequest<Client[] | { content?: Client[] }>(getApiUrl('/api/client/all'));
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
        <h2 className="ui-page-title">
          Клиенты
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Управляйте клиентской базой и статусами заявок.
        </p>
      </div>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-2 md:space-y-0">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="search">
            Поиск
          </label>
          <Input
            id="search"
            type="text"
            className="mt-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Введите имя клиента"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700" htmlFor="status">
            Статус
          </label>
          {/* Контейнер с относительным позиционированием для стилизованного select */}
          <div className="relative mt-1">
            <NativeSelect
              id="status"
              className="block h-10 w-full appearance-none rounded-lg border border-black/12 bg-white px-3 pr-8 text-sm outline-hidden focus:border-admin-600 focus:ring-4 focus:ring-blue-100"
              value={statusFilter}
              onChange={(e) => {
                const next = e.target.value;
                setStatusFilter(next === "ALL" || isClientStatus(next) ? next : "ALL");
              }}
            >
              <option value="ALL">Все</option>
              {Object.keys(statusLabels).map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status as ClientStatus]}
                </option>
              ))}
            </NativeSelect>
            {/* SVG‑стрелка поверх select, не перехватывающая клики */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>
      </div>
      </div>
      <div className="overflow-x-auto glass-card rounded-2xl p-3">
        <Table className="min-w-[640px]">
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Имя</TableHead><TableHead>Телефон</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-slate-500">
                    Загрузка клиентов...
                  </TableCell></TableRow>
              )}
              {filtered.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="text-sm text-slate-900">
                    {client.name}
                  </TableCell>
                  <TableCell className="text-sm text-slate-900">
                    {client.phone}
                  </TableCell>
                  <TableCell className="text-sm text-slate-900">
                    {statusLabels[client.status]}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-slate-500">
                    Нет клиентов, соответствующих критериям
                  </TableCell></TableRow>
              )}
            </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ClientsPage;
  const isClientStatus = (value: string): value is ClientStatus =>
    Object.prototype.hasOwnProperty.call(statusLabels, value);
