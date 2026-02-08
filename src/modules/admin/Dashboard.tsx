import React, { useEffect, useMemo, useState } from 'react';
// Icons representing each admin statistic
import {
  DocumentTextIcon,
  CreditCardIcon,
  UserIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../shared/AuthContext';
import { useAdminBranch } from './BranchContext';
import { GroupApi, GroupApiModel } from './groups/group.api';
import { ScheduleApi } from './groups/schedule/schedule.api';
import { GroupScheduleDto, DayOfWeek } from './groups/schedule/schedule.types';
import toast from 'react-hot-toast';
import { getApiUrl } from '../../shared/api';

/**
 * Administrator dashboard.  Presents high‑level statistics about
 * contracts, payments and user accounts.  Currently uses static
 * placeholder data.  */
const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();

  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [scheduleStatus, setScheduleStatus] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ACTIVE');
  const [schedules, setSchedules] = useState<GroupScheduleDto[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<GroupScheduleDto | null>(null);
  const [coachInfo, setCoachInfo] = useState<{ firstName: string; lastName: string; phone?: string; email?: string } | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);

  const stats = {
    totalContracts: 12,
    pendingPayments: 5,
    activeUsers: 3,
  };

  useEffect(() => {
    if (!token || !branchId) return;
    GroupApi.listByBranch(branchId, token)
      .then((data) => {
        setGroups(data);
      })
      .catch((e) => {
        console.error(e);
        toast.error('Не удалось загрузить группы');
      });
  }, [token, branchId]);

  useEffect(() => {
    if (!token || !branchId || groups.length === 0) return;
    setLoadingSchedules(true);
    const loadForGroup = async (groupId: string) => {
      if (scheduleStatus === 'ALL') {
        const [active, cancelled] = await Promise.all([
          ScheduleApi.listByGroupAndBranch(groupId, branchId, token, 'ACTIVE'),
          ScheduleApi.listByGroupAndBranch(groupId, branchId, token, 'CANCELLED'),
        ]);
        return [...(active ?? []), ...(cancelled ?? [])];
      }
      return ScheduleApi.listByGroupAndBranch(groupId, branchId, token, scheduleStatus);
    };

    Promise.all(groups.map((g) => loadForGroup(g.groupId)))
      .then((chunks) => setSchedules(chunks.flat()))
      .catch((e) => {
        console.error(e);
        toast.error('Не удалось загрузить расписание');
        setSchedules([]);
      })
      .finally(() => setLoadingSchedules(false));
  }, [token, branchId, groups, scheduleStatus]);

  useEffect(() => {
    if (!token || !selectedSchedule) return;
    setLoadingCoach(true);
    fetch(getApiUrl(`/coaches/${selectedSchedule.coachId}`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok) throw new Error(text || 'Request failed');
        return text ? JSON.parse(text) : null;
      })
      .then((data) => {
        if (!data) {
          setCoachInfo(null);
          return;
        }
        setCoachInfo({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          email: data.email,
        });
      })
      .catch((e) => {
        console.error(e);
        setCoachInfo(null);
      })
      .finally(() => setLoadingCoach(false));
  }, [token, selectedSchedule]);

  const groupMeta = useMemo(() => {
    const palette = [
      { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
      { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
      { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
      { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' },
      { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700' },
      { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
    ];
    return Object.fromEntries(
      groups.map((g, idx) => [
        g.groupId,
        { name: g.name, ...palette[idx % palette.length] },
      ])
    );
  }, [groups]);

  const scheduleCounts = useMemo(() => {
    const active = schedules.filter((s) => s.status === 'ACTIVE').length;
    const cancelled = schedules.filter((s) => s.status === 'CANCELLED').length;
    return { total: schedules.length, active, cancelled };
  }, [schedules]);
  return (
    <div className="space-y-6">
      <h2 className="heading-font text-2xl font-semibold text-admin-700">
        Панель администратора
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card for contracts */}
        <div className="p-4 bg-white shadow rounded-2xl flex items-center space-x-4">
          <div className="p-2 bg-admin-100 rounded-full">
            <DocumentTextIcon className="h-6 w-6 text-admin-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Контракты</div>
            <div className="text-2xl font-bold text-admin-700">{stats.totalContracts}</div>
          </div>
        </div>
        {/* Card for pending payments */}
        <div className="p-4 bg-white shadow rounded-2xl flex items-center space-x-4">
          <div className="p-2 bg-admin-100 rounded-full">
            <CreditCardIcon className="h-6 w-6 text-admin-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Ожидающие платежи</div>
            <div className="text-2xl font-bold text-admin-700">{stats.pendingPayments}</div>
          </div>
        </div>
        {/* Card for active users */}
        <div className="p-4 bg-white shadow rounded-2xl flex items-center space-x-4">
          <div className="p-2 bg-admin-100 rounded-full">
            <UserIcon className="h-6 w-6 text-admin-500" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Активные пользователи</div>
            <div className="text-2xl font-bold text-admin-700">{stats.activeUsers}</div>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-white shadow rounded-2xl p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-admin-700">
              <CalendarDaysIcon className="h-5 w-5" />
              <h3 className="heading-font text-lg font-semibold">
                Расписание филиала
              </h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Недельный обзор по выбранной группе
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-0.5">
              {(['ALL', 'ACTIVE', 'CANCELLED'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScheduleStatus(value)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition ${
                    scheduleStatus === value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {value === 'ALL' ? 'Все' : value === 'ACTIVE' ? 'Активные' : 'Отменённые'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <div className="text-xs text-gray-500 mr-2">Группы:</div>
          {groups.map((g) => {
            const meta = groupMeta[g.groupId];
            return (
              <span
                key={g.groupId}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${meta?.bg ?? 'bg-gray-50'} ${meta?.border ?? 'border-gray-200'} ${meta?.text ?? 'text-gray-700'}`}
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                {g.name}
              </span>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Активные
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            Отменённые
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Всего событий</div>
            <div className="text-lg font-semibold text-gray-900">{scheduleCounts.total}</div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="text-xs text-emerald-700">Активные</div>
            <div className="text-lg font-semibold text-emerald-700">{scheduleCounts.active}</div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <div className="text-xs text-rose-700">Отменённые</div>
            <div className="text-lg font-semibold text-rose-700">{scheduleCounts.cancelled}</div>
          </div>
        </div>

        <div className="mt-4">
          {loadingSchedules ? (
            <div className="text-sm text-gray-500">Загрузка расписания…</div>
          ) : schedules.length === 0 ? (
            <div className="text-sm text-gray-500">
              Расписание не найдено
            </div>
          ) : (
            <WeekCalendar
              schedules={schedules}
              groupMeta={groupMeta}
              onSelectSchedule={(s) => setSelectedSchedule(s)}
            />
          )}
        </div>
      </div>

      {selectedSchedule && (
        <ScheduleDetailsModal
          schedule={selectedSchedule}
          groupMeta={groupMeta}
          coachInfo={coachInfo}
          loadingCoach={loadingCoach}
          onClose={() => setSelectedSchedule(null)}
          onCancel={async () => {
            if (!token) return;
            try {
              if (selectedSchedule.status === 'ACTIVE') {
                await ScheduleApi.cancelSchedule(selectedSchedule.scheduleId, token);
                toast.success('Занятие отменено');
              } else {
                await ScheduleApi.activateSchedule(selectedSchedule.scheduleId, token);
                toast.success('Занятие активировано');
              }
              setSelectedSchedule(null);
              // refresh
              if (branchId && groups.length) {
                setLoadingSchedules(true);
                const statusParam = scheduleStatus;
                const loadForGroup = async (groupId: string) => {
                  if (statusParam === 'ALL') {
                    const [active, cancelled] = await Promise.all([
                      ScheduleApi.listByGroupAndBranch(groupId, branchId, token, 'ACTIVE'),
                      ScheduleApi.listByGroupAndBranch(groupId, branchId, token, 'CANCELLED'),
                    ]);
                    return [...(active ?? []), ...(cancelled ?? [])];
                  }
                  return ScheduleApi.listByGroupAndBranch(groupId, branchId, token, statusParam);
                };
                const chunks = await Promise.all(groups.map((g) => loadForGroup(g.groupId)));
                setSchedules(chunks.flat());
                setLoadingSchedules(false);
              }
            } catch (e) {
              console.error(e);
              toast.error('Не удалось отменить расписание');
            }
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'MONDAY', label: 'Пн' },
  { key: 'TUESDAY', label: 'Вт' },
  { key: 'WEDNESDAY', label: 'Ср' },
  { key: 'THURSDAY', label: 'Чт' },
  { key: 'FRIDAY', label: 'Пт' },
  { key: 'SATURDAY', label: 'Сб' },
  { key: 'SUNDAY', label: 'Вс' },
];

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_HEIGHT = 56;

const timeToMinutes = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};

const WeekCalendar: React.FC<{
  schedules: GroupScheduleDto[];
  groupMeta: Record<string, { name: string; bg: string; border: string; text: string }>;
  onSelectSchedule: (schedule: GroupScheduleDto) => void;
}> = ({ schedules, groupMeta, onSelectSchedule }) => {
  const byDay = useMemo(() => {
    return schedules.reduce<Record<DayOfWeek, GroupScheduleDto[]>>((acc, s) => {
      acc[s.dayOfWeek] = acc[s.dayOfWeek] ?? [];
      acc[s.dayOfWeek].push(s);
      return acc;
    }, {} as Record<DayOfWeek, GroupScheduleDto[]>);
  }, [schedules]);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[80px_repeat(7,1fr)] bg-gray-50 border-b border-gray-200">
        <div className="p-2 text-xs text-gray-400">Время</div>
        {DAYS.map((d) => (
          <div key={d.key} className="p-2 text-xs font-medium text-gray-600 text-center">
            {d.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[80px_repeat(7,1fr)]">
        <div className="border-r border-gray-200 bg-gray-50">
          {hours.map((h) => (
            <div
              key={h}
              style={{ height: HOUR_HEIGHT }}
              className="border-b border-gray-100 px-2 text-xs text-gray-400 flex items-start pt-1"
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {DAYS.map((d) => (
          <div key={d.key} className="relative border-r border-gray-100">
            {hours.map((h) => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-gray-100" />
            ))}

            {(byDay[d.key] ?? []).map((s) => {
              const start = timeToMinutes(s.startTime);
              const end = timeToMinutes(s.endTime);
              const minStart = Math.max(start, START_HOUR * 60);
              const minEnd = Math.min(end, END_HOUR * 60);
              if (minEnd <= minStart) return null;

              const top = ((minStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
              const height = ((minEnd - minStart) / 60) * HOUR_HEIGHT;
              const isCancelled = s.status === 'CANCELLED';
              const isTemporary = s.scheduleType === 'TEMPORARY';
              const meta = groupMeta[s.groupId];

              return (
                <div
                  key={s.scheduleId}
                  className={`absolute left-2 right-2 rounded-xl border px-2 py-1 text-xs shadow-sm ${
                    meta ? `${meta.bg} ${meta.border} ${meta.text}` : 'bg-gray-50 border-gray-200 text-gray-700'
                  } ${isCancelled ? 'opacity-70' : ''}`}
                  style={{ top, height }}
                  role="button"
                  onClick={() => onSelectSchedule(s)}
                >
                  <div className="font-semibold">
                    {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {isTemporary ? 'Временное' : 'Регулярное'}
                  </div>
                  <div className="text-[10px] opacity-80">
                    {meta?.name ?? 'Группа'} · Coach {s.coachId.slice(0, 6)}…
                  </div>
                  {isCancelled && (
                    <div className="mt-1 inline-flex px-1.5 py-0.5 rounded bg-rose-100 text-[9px] font-semibold text-rose-700">
                      Отменено
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

const ScheduleDetailsModal: React.FC<{
  schedule: GroupScheduleDto;
  groupMeta: Record<string, { name: string; bg: string; border: string; text: string }>;
  coachInfo: { firstName: string; lastName: string; phone?: string; email?: string } | null;
  loadingCoach: boolean;
  onClose: () => void;
  onCancel: () => void;
}> = ({ schedule, groupMeta, coachInfo, loadingCoach, onClose, onCancel }) => {
  const meta = groupMeta[schedule.groupId];
  const statusLabel = schedule.status === 'ACTIVE' ? 'Активно' : 'Отменено';
  const typeLabel = schedule.scheduleType === 'TEMPORARY' ? 'Временное' : 'Регулярное';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="heading-font text-lg font-semibold text-gray-900">
              Детали занятия
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {schedule.dayOfWeek} · {schedule.startTime.slice(0, 5)}–{schedule.endTime.slice(0, 5)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 text-2xl leading-none hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${meta?.bg ?? 'bg-gray-50'} ${meta?.border ?? 'border-gray-200'} ${meta?.text ?? 'text-gray-700'}`}>
            {meta?.name ?? 'Группа'}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-xs text-gray-500">Тип</div>
              <div className="font-medium text-gray-900">{typeLabel}</div>
            </div>
            <div
              className={`rounded-xl border px-3 py-2 ${
                schedule.status === 'ACTIVE'
                  ? 'border-emerald-200 bg-emerald-50'
                  : 'border-rose-200 bg-rose-50'
              }`}
            >
              <div className="text-xs text-gray-500">Статус</div>
              <div
                className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  schedule.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {statusLabel}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Период</div>
            <div className="font-medium text-gray-900">
              {schedule.startDate} — {schedule.endDate}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Тренер</div>
            {loadingCoach ? (
              <div className="text-sm text-gray-500">Загрузка…</div>
            ) : coachInfo ? (
              <div className="space-y-1">
                <div className="font-medium text-gray-900">
                  {coachInfo.firstName} {coachInfo.lastName}
                </div>
                {coachInfo.email && <div className="text-xs text-gray-500">{coachInfo.email}</div>}
                {coachInfo.phone && <div className="text-xs text-gray-500">{coachInfo.phone}</div>}
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                ID: {schedule.coachId}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
          >
            Закрыть
          </button>
          {schedule.status === 'ACTIVE' ? (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700"
            >
              Отменить
            </button>
          ) : (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
            >
              Активировать
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
