import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../../../shared/api";
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  ModalShell,
  PageHeader,
  PageShell,
  SectionCard,
} from "../../../shared/ui";
import { useAuth } from "../../../shared/AuthContext";
import { useAdminBranch } from "../BranchContext";
import { GroupApi } from "../groups/group.api";
import { StudentApi } from "./student.api";
import type {
  AdminStudentDetails,
  AdminStudentListItem,
  StudentRisk,
  StudentRiskCode,
  StudentRiskSeverity,
} from "./student.types";
import type { ContractPaymentStatus, ContractStatus, PaymentMethod, PaymentStatus } from "../contracts/contracts.types";

type PaymentFilter = ContractPaymentStatus | "all";
type ContractFilter = ContractStatus | "all";
type RiskFilter = StudentRiskCode | "all";

const formatAmount = (value?: number | null, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU").format(Number(value ?? 0))} ${currency}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(date);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const paymentStatusLabel = (status?: ContractPaymentStatus | null) => {
  switch (status) {
    case "PAID":
      return "Оплачен";
    case "PARTIALLY_PAID":
      return "Частично оплачен";
    case "UNPAID":
      return "Не оплачен";
    default:
      return "Нет договора";
  }
};

const contractStatusLabel = (status?: ContractStatus | null) => {
  switch (status) {
    case "ACTIVE":
      return "Активен";
    case "UPCOMING":
      return "Скоро начнется";
    case "EXPIRED":
      return "Истек";
    case "CANCELLED":
      return "Отменен";
    case "DRAFT":
      return "Черновик";
    default:
      return "Нет договора";
  }
};

const attendanceLabel = (status: AdminStudentDetails["recentAttendance"][number]["status"]) => {
  switch (status) {
    case "PRESENT":
      return "Присутствовал";
    case "ABSENT":
      return "Отсутствовал";
    case "LATE":
      return "Опоздал";
    case "EXCUSED":
      return "Уважительная причина";
    default:
      return status;
  }
};

const paymentMethodLabel = (method: PaymentMethod) => {
  switch (method) {
    case "CASH":
      return "Наличные";
    case "CARD":
      return "Карта";
    case "BANK_TRANSFER":
      return "Перевод";
    case "KASPI":
      return "Kaspi";
    case "OTHER":
      return "Другое";
    default:
      return method;
  }
};

const paymentRecordStatusLabel = (status: PaymentStatus) => (status === "CANCELLED" ? "Отменен" : "Зафиксирован");

const clientStatusLabel = (status?: string | null) => {
  switch (status) {
    case "ACTIVE":
      return "Активный";
    case "INACTIVE":
      return "Неактивный";
    case "ARCHIVED":
      return "В архиве";
    case "BLOCKED":
      return "Заблокирован";
    default:
      return status || "Не указан";
  }
};

const riskLabel = (risk: StudentRisk) => {
  switch (risk.code) {
    case "DEBT":
      return "Есть долг";
    case "ENDING_SOON":
      return "Договор истекает";
    case "EXPIRED_CONTRACT":
      return "Договор истек";
    case "LOW_ATTENDANCE":
      return "Низкая посещаемость";
    case "NO_GROUP":
      return "Без группы";
    default:
      return risk.label;
  }
};

const riskClassName = (severity: StudentRiskSeverity) => {
  switch (severity) {
    case "CRITICAL":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "WARNING":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const paymentBadgeClassName = (status?: ContractPaymentStatus | null) => {
  switch (status) {
    case "PAID":
      return "border-emerald-100 bg-emerald-50 text-emerald-800";
    case "PARTIALLY_PAID":
      return "border-amber-100 bg-amber-50 text-amber-800";
    case "UNPAID":
      return "border-rose-100 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

const StudentsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedPlayerIdRef = useRef<string | null>(null);
  const { branchId, branchName } = useAdminBranch();

  const [students, setStudents] = useState<AdminStudentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>("all");
  const [contractStatus, setContractStatus] = useState<ContractFilter>("all");
  const [groupId, setGroupId] = useState("all");
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadStudents = async (mode: "initial" | "refresh" = "initial") => {
    if (!token || !branchId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    try {
      const response = await StudentApi.list({
        branchId,
        search: debouncedSearch || undefined,
        paymentStatus,
        contractStatus,
        groupId: groupId !== "all" ? groupId : undefined,
        risk,
        size: 100,
        sort: risk !== "all" ? "outstandingAmount,desc" : "playerName,asc",
      });
      setStudents(response.content ?? []);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, "Не удалось загрузить учеников"));
      setStudents([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadStudents();
  }, [token, branchId, debouncedSearch, paymentStatus, contractStatus, groupId, risk]);

  useEffect(() => {
    if (!token || !branchId) {
      setGroups([]);
      setGroupId("all");
      return;
    }

    const loadGroups = async () => {
      setGroupsLoading(true);
      try {
        const result = await GroupApi.listByBranch(branchId, token);
        setGroups(result.map((group) => ({ id: group.groupId, name: group.name })));
      } catch (err) {
        console.error(err);
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    };

    void loadGroups();
  }, [branchId, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timeoutId);
  }, [search]);

  useEffect(() => {
    const playerIdFromQuery = searchParams.get("playerId");
    if (!token || !branchId || !playerIdFromQuery) return;
    if (autoOpenedPlayerIdRef.current === playerIdFromQuery) return;

    autoOpenedPlayerIdRef.current = playerIdFromQuery;
    void openStudent(playerIdFromQuery);
  }, [branchId, searchParams, students, token]);

  const summary = useMemo(() => {
    const withDebt = students.filter((student) => Number(student.outstandingAmount ?? 0) > 0).length;
    const riskCount = students.filter((student) => student.risks.length > 0).length;
    const paid = students.filter((student) => student.paymentStatus === "PAID").length;
    return { total: students.length, withDebt, riskCount, paid };
  }, [students]);

  const openStudent = async (playerId: string) => {
    if (!token) return;
    setDetailsLoading(true);
    try {
      const details = await StudentApi.get(playerId);
      setSelectedStudent(details);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, "Не удалось открыть карточку ученика"));
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeStudentDetails = () => {
    autoOpenedPlayerIdRef.current = null;
    setSelectedStudent(null);
    if (searchParams.get("playerId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("playerId");
      setSearchParams(nextParams, { replace: true });
    }
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Ученики"
        description={`Операционный список клиентов и учеников${branchName ? ` филиала ${branchName}` : ""}: договоры, оплаты, группы и риски.`}
        actions={
          <Button type="button" variant="secondary" onClick={() => void loadStudents("refresh")} isLoading={refreshing}>
            <ArrowPathIcon className="h-4 w-4" />
            Обновить
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard label="Всего" value={summary.total} />
        <MetricCard label="Оплачены" value={summary.paid} tone="success" />
        <MetricCard label="С долгом" value={summary.withDebt} tone="danger" />
        <MetricCard label="С рисками" value={summary.riskCount} tone="warning" />
      </div>

      <SectionCard
        title="Фильтры"
        description="Поиск по ученику, родителю, телефону или договору. Фильтры применяются сразу."
        icon={<UserCircleIcon className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ученик, родитель, телефон, договор"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100 lg:col-span-1"
          />
          <select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value as PaymentFilter)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          >
            <option value="all">Любая оплата</option>
            <option value="PAID">Оплачен</option>
            <option value="PARTIALLY_PAID">Частично оплачен</option>
            <option value="UNPAID">Не оплачен</option>
          </select>
          <select
            value={contractStatus}
            onChange={(event) => setContractStatus(event.target.value as ContractFilter)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          >
            <option value="all">Любой договор</option>
            <option value="ACTIVE">Активный</option>
            <option value="UPCOMING">Скоро начнется</option>
            <option value="EXPIRED">Истек</option>
            <option value="CANCELLED">Отменен</option>
          </select>
          <select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            disabled={groupsLoading}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="all">{groupsLoading ? "Группы загружаются..." : "Любая группа"}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <QuickRiskFilters value={risk} onChange={setRisk} />
      </SectionCard>

      <SectionCard
        title="Список учеников"
        description="Карточки отсортированы для ежедневной работы: деньги, договор, группа и посещаемость видны сразу."
        icon={<UserGroupIcon className="h-4 w-4" />}
      >
        {error ? (
          <ErrorState message={error} onRetry={() => void loadStudents("refresh")} />
        ) : loading ? (
          <LoadingState label="Загрузка учеников..." />
        ) : students.length === 0 ? (
          <EmptyState title="Ученики не найдены" description="Измените фильтры или проверьте выбранный филиал." />
        ) : (
          <div className="space-y-2">
            {students.map((student) => (
              <StudentRow
                key={student.playerId}
                student={student}
                onOpen={() => void openStudent(student.playerId)}
                onOpenContract={() =>
                  student.contractId
                    ? navigate(`/admin/contracts?contractId=${encodeURIComponent(student.contractId)}&mode=view`)
                    : undefined
                }
                onOpenGroup={() => (student.groupId ? navigate(`/admin/groups/${student.groupId}`) : undefined)}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {selectedStudent || detailsLoading ? (
        <StudentDetailsModal
          student={selectedStudent}
          loading={detailsLoading}
          onClose={closeStudentDetails}
          onOpenContract={(contractId) =>
            navigate(`/admin/contracts?contractId=${encodeURIComponent(contractId)}&mode=view`)
          }
          onAddPayment={(contractId) =>
            navigate(`/admin/contracts?contractId=${encodeURIComponent(contractId)}&mode=view&payment=create`)
          }
          onOpenGroup={(groupId) => navigate(`/admin/groups/${groupId}`)}
        />
      ) : null}
    </PageShell>
  );
};

const StudentRow: React.FC<{
  student: AdminStudentListItem;
  onOpen: () => void;
  onOpenContract: () => void | undefined;
  onOpenGroup: () => void | undefined;
}> = ({ student, onOpen, onOpenContract, onOpenGroup }) => (
  <article className="rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition hover:border-slate-300">
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <h3 className="heading-font text-base font-semibold text-slate-900">
            {student.playerName}
            {student.age ? <span className="text-slate-500">, {student.age} лет</span> : null}
          </h3>
          <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentBadgeClassName(student.paymentStatus)}`}>
            {paymentStatusLabel(student.paymentStatus)}
          </span>
          <div className="flex flex-wrap gap-2 lg:ml-2">
            <ActionButton icon={<EyeIconShim />} label="Открыть" onClick={onOpen} />
            {student.contractId ? <ActionButton icon={<DocumentTextIcon className="h-4 w-4" />} label="Договор" onClick={onOpenContract} /> : null}
            {student.groupId ? <ActionButton icon={<UserGroupIcon className="h-4 w-4" />} label="Группа" onClick={onOpenGroup} /> : null}
          </div>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-slate-600 md:grid-cols-2">
          <div>
            Родитель: <span className="font-medium text-slate-900">{student.parentName}</span>
          </div>
          <div>{student.phone}</div>
          <div>
            Группа: <span className="font-medium text-slate-900">{student.groupName || "Не назначена"}</span>
          </div>
          <div>Тренер: {student.coachName || "Не указан"}</div>
        </div>

        {student.risks.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {student.risks.map((item) => (
              <RiskBadge key={item.code} risk={item} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 xl:min-w-[520px] xl:text-right">
        <CompactFact label="Остаток" value={formatAmount(student.outstandingAmount)} tone={Number(student.outstandingAmount ?? 0) > 0 ? "danger" : "success"} />
        <CompactFact label="Договор до" value={formatDate(student.contractEndDate)} />
        <CompactFact label="Оплачено" value={formatAmount(student.paidAmount)} />
        <CompactFact label="Посещаемость" value={student.attendanceRate == null ? "—" : `${student.attendanceRate}%`} />
      </div>
    </div>
  </article>
);

const QUICK_RISK_FILTERS: Array<{ value: RiskFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "DEBT", label: "С долгом" },
  { value: "ENDING_SOON", label: "Истекают" },
  { value: "EXPIRED_CONTRACT", label: "Истек договор" },
  { value: "LOW_ATTENDANCE", label: "Низкая посещаемость" },
  { value: "NO_GROUP", label: "Без группы" },
];

const QuickRiskFilters: React.FC<{ value: RiskFilter; onChange: (value: RiskFilter) => void }> = ({
  value,
  onChange,
}) => (
  <div className="mt-3 flex flex-wrap gap-2">
    {QUICK_RISK_FILTERS.map((item) => {
      const active = item.value === value;
      return (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            active
              ? "border-cyan-700 bg-cyan-50 text-cyan-800"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

const StudentDetailsModal: React.FC<{
  student: AdminStudentDetails | null;
  loading: boolean;
  onClose: () => void;
  onOpenContract: (contractId: string) => void;
  onAddPayment: (contractId: string) => void;
  onOpenGroup: (groupId: string) => void;
}> = ({ student, loading, onClose, onOpenContract, onAddPayment, onOpenGroup }) => (
  <ModalShell
    title={student?.player.fullName ?? "Карточка ученика"}
    description={student ? `${student.client.fullName} · ${student.client.phone}` : "Загрузка карточки ученика"}
    eyebrow="Ученик"
    onClose={onClose}
    maxWidthClassName="max-w-5xl"
    footer={
      student ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {student.currentContract ? (
              <Button type="button" onClick={() => onAddPayment(student.currentContract!.id)}>
                <CreditCardIcon className="h-4 w-4" />
                Добавить оплату
              </Button>
            ) : null}
            {student.currentContract ? (
              <Button type="button" variant="secondary" onClick={() => onOpenContract(student.currentContract!.id)}>
                <DocumentTextIcon className="h-4 w-4" />
                Открыть договор
              </Button>
            ) : null}
            {student.currentGroup ? (
              <Button type="button" variant="secondary" onClick={() => onOpenGroup(student.currentGroup!.id)}>
                <UserGroupIcon className="h-4 w-4" />
                Открыть группу
              </Button>
            ) : null}
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      ) : null
    }
  >
    {loading || !student ? (
      <LoadingState label="Загрузка карточки..." />
    ) : (
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <SummaryTile label="Остаток" value={formatAmount(student.currentContract?.outstandingAmount, student.currentContract?.currency)} icon={<CreditCardIcon className="h-5 w-5" />} />
          <SummaryTile label="Оплачено" value={formatAmount(student.currentContract?.paidAmount, student.currentContract?.currency)} />
          <SummaryTile label="Договор до" value={formatDate(student.currentContract?.endDate)} icon={<DocumentTextIcon className="h-5 w-5" />} />
          <SummaryTile label="Посещаемость" value={student.attendanceSummary?.attendanceRate == null ? "—" : `${student.attendanceSummary.attendanceRate}%`} icon={<CalendarDaysIcon className="h-5 w-5" />} />
        </div>

        {student.risks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {student.risks.map((item) => (
              <RiskBadge key={item.code} risk={item} />
            ))}
          </div>
        ) : null}

        <Panel title="Клиент">
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-4">
            <MiniStat label="Имя" value={student.client.fullName} />
            <MiniStat label="Телефон" value={student.client.phone || "Не указан"} />
            <MiniStat label="Email" value={student.client.email || "Не указан"} />
            <MiniStat label="Статус" value={clientStatusLabel(student.client.status)} />
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Текущий договор">
            {student.currentContract ? (
              <div className="space-y-3 text-sm text-slate-600">
                <div className="text-base font-semibold text-slate-900">{student.currentContract.contractNumber}</div>
                <div>{contractStatusLabel(student.currentContract.status)} · {formatDate(student.currentContract.startDate)} - {formatDate(student.currentContract.endDate)}</div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Сумма" value={formatAmount(student.currentContract.amount, student.currentContract.currency)} />
                  <MiniStat label="Оплачено" value={formatAmount(student.currentContract.paidAmount, student.currentContract.currency)} />
                  <MiniStat label="Остаток" value={formatAmount(student.currentContract.outstandingAmount, student.currentContract.currency)} />
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentBadgeClassName(student.currentContract.paymentStatus)}`}>
                  {paymentStatusLabel(student.currentContract.paymentStatus)}
                </span>
              </div>
            ) : (
              <EmptyState title="Договор не найден" description="У ученика нет текущего активного или ближайшего договора." />
            )}
          </Panel>

          <Panel title="Текущая группа">
            {student.currentGroup ? (
              <div className="space-y-2 text-sm text-slate-600">
                <div className="text-base font-semibold text-slate-900">{student.currentGroup.name}</div>
                <div>Тренер: {student.currentGroup.coachName || "Не указан"}</div>
                <div>Расписание: {student.currentGroup.scheduleLabel || "Не указано"}</div>
                <div>Следующее занятие: {formatDateTime(student.currentGroup.nextSessionAt)}</div>
              </div>
            ) : (
              <EmptyState title="Группа не назначена" description="Группа появится после активного договора с привязкой к группе." />
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="Последние платежи">
            {student.recentPayments.length === 0 ? (
              <EmptyState title="Платежей пока нет" />
            ) : (
              <div className="space-y-2">
                {student.recentPayments.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{formatAmount(payment.amount, payment.currency)}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(payment.paidAt)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {paymentMethodLabel(payment.method)} · {paymentRecordStatusLabel(payment.status)}
                      {payment.comment ? ` · ${payment.comment}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Последние занятия">
            {student.recentAttendance.length === 0 ? (
              <EmptyState title="Посещаемости пока нет" />
            ) : (
              <div className="space-y-2">
                {student.recentAttendance.map((item) => (
                  <div key={item.sessionId} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold text-slate-900">{attendanceLabel(item.status)}</div>
                      <div className="text-xs text-slate-500">{formatDate(item.date)}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{item.groupName}</div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    )}
  </ModalShell>
);

const MetricCard: React.FC<{ label: string; value: number; tone?: "neutral" | "success" | "warning" | "danger" }> = ({
  label,
  value,
  tone = "neutral",
}) => {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
      ? "text-rose-700"
      : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
};

const CompactFact: React.FC<{ label: string; value: string; tone?: "neutral" | "success" | "danger" }> = ({
  label,
  value,
  tone = "neutral",
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
    <div className="text-[11px] font-medium uppercase text-slate-400">{label}</div>
    <div className={`mt-1 text-sm font-semibold ${tone === "danger" ? "text-rose-700" : tone === "success" ? "text-emerald-700" : "text-slate-900"}`}>
      {value}
    </div>
  </div>
);

const SummaryTile: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="flex items-center justify-between gap-3 text-slate-500">
      <div className="text-xs font-medium uppercase">{label}</div>
      {icon}
    </div>
    <div className="mt-2 text-xl font-semibold text-slate-900">{value}</div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
    <div className="text-[11px] font-medium uppercase text-slate-400">{label}</div>
    <div className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    <div className="mt-3">{children}</div>
  </section>
);

const RiskBadge: React.FC<{ risk: StudentRisk }> = ({ risk }) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${riskClassName(risk.severity)}`}>
    {riskLabel(risk)}
  </span>
);

const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
  >
    {icon}
    {label}
  </button>
);

const EyeIconShim = () => <UserCircleIcon className="h-4 w-4" />;

export default StudentsPage;
