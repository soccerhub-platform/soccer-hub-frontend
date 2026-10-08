import React, { useEffect, useState } from "react";
import {
  TrialTraining, TrialTrainingStatus } from "../../shared/types";
import { ChevronDown } from "lucide-react";
import { NativeSelect, Table, TableBody, TableCell, TableHead, TableHeader, TableRow   } from "../../shared/ui";
import { apiClient } from "../../shared/api";

const statusLabels: Record<TrialTrainingStatus, string> = {
  SCHEDULED: "Запланирована",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена",
  NO_SHOW: "Не пришел",
};

const TrialTrainingsPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<TrialTrainingStatus | "ALL">("ALL");
  const [items, setItems] = useState<TrialTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.get<TrialTraining[] | { content?: TrialTraining[] }>("/dispatcher/trial-trainings");
        setItems(Array.isArray(data) ? data : data.content ?? []);
      } catch {
        setError("Не удалось загрузить пробные тренировки");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = items.filter((training) => statusFilter === "ALL" || training.status === statusFilter);

  const formatDate = (iso: string) => {
    const dt = new Date(iso);
    return dt.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <h2 className="mb-4 ui-page-title">Пробные тренировки</h2>
      {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}
      <div className="mb-4 max-w-xs">
        <label htmlFor="statusFilter" className="block text-sm font-medium text-slate-700">Статус</label>
        <div className="relative mt-1">
          <NativeSelect
            id="statusFilter"
            className="block w-full appearance-none bg-white px-3 py-2 pr-8 border border-slate-300 rounded-md focus:outline-hidden focus:ring-blue-100 focus:border-admin-600"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TrialTrainingStatus | "ALL")}
          >
            <option value="ALL">Все</option>
            {Object.keys(statusLabels).map((status) => (
              <option key={status} value={status}>{statusLabels[status as TrialTrainingStatus]}</option>
            ))}
          </NativeSelect>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Дата</TableHead><TableHead>Клиент ID</TableHead><TableHead>Статус</TableHead></TableRow></TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-slate-500">Загрузка...</TableCell></TableRow>
            )}
            {!loading && filtered.map((training) => (
              <TableRow key={training.id}><TableCell className="text-sm text-slate-900">{formatDate(training.date)}</TableCell><TableCell className="text-sm text-slate-900">{training.clientId}</TableCell><TableCell className="text-sm text-slate-900">{statusLabels[training.status]}</TableCell></TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-slate-500">Нет записей</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TrialTrainingsPage;
