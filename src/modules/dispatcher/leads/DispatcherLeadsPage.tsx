import React, { useEffect, useState } from "react";
import {
  Plus } from "lucide-react";
import { useAuth } from "../../../shared/AuthContext";
import CreateLeadModal from "./CreateLeadModal";
import { DispatcherLeadsApi } from "./leads.api";
import { DispatcherBranchOption, DispatcherLead } from "./types";
import {
  NativeSelect,
  Button,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  PageShell,
  SectionCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  formControlClassName,
  } from "../../../shared/ui";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const statusLabel = (status: string) => {
  switch (status) {
    case "NEW":
      return "Новый";
    case "IN_PROGRESS":
      return "В работе";
    case "TRIAL_SCHEDULED":
      return "Пробное назначено";
    case "DECISION_PENDING":
      return "Ожидает решения";
    case "CONVERTED":
      return "Клиент";
    case "LOST":
      return "Отказ";
    default:
      return status;
  }
};

const DispatcherLeadsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;

  const [branches, setBranches] = useState<DispatcherBranchOption[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [leads, setLeads] = useState<DispatcherLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    const loadBranches = async () => {
      try {
        const data = await DispatcherLeadsApi.listBranches();
        if (!isMounted) return;
        setBranches(data);
        if (!selectedBranchId && data.length > 0) {
          setSelectedBranchId(data[0].id);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError("Не удалось загрузить филиалы");
      }
    };

    loadBranches();

    return () => {
      isMounted = false;
    };
  }, [token, selectedBranchId]);

  useEffect(() => {
    if (!token || !selectedBranchId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadLeads = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await DispatcherLeadsApi.list(selectedBranchId);
        if (!isMounted) return;
        setLeads(data);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError("Не удалось загрузить лиды");
        setLeads([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLeads();

    return () => {
      isMounted = false;
    };
  }, [selectedBranchId, token]);

  const refreshLeads = async () => {
    if (!token || !selectedBranchId) return;

    setError(null);
    try {
      const data = await DispatcherLeadsApi.list(selectedBranchId);
      setLeads(data);
    } catch (err) {
      console.error(err);
      setError("Не удалось загрузить лиды");
    }
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Лиды"
        description="Диспетчер создает и просматривает входящие лиды по выбранному филиалу."
        actions={
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedBranchId}
          >
            <Plus className="h-4 w-4" />
            Новый лид
          </Button>
        }
      />

      <SectionCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <FormField label="Филиал" className="sm:w-80">
            <NativeSelect
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
              className={formControlClassName}
            >
              <option value="">Выберите филиал</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <div className="text-sm text-slate-500">
            {selectedBranchId ? `Лидов: ${leads.length}` : "Выберите филиал для просмотра"}
          </div>
        </div>
      </SectionCard>

      {error ? (
        <ErrorState message={error} onRetry={refreshLeads} />
      ) : null}

      <SectionCard>
        {loading ? (
          <LoadingState label="Загрузка лидов..." />
        ) : !selectedBranchId ? (
          <EmptyState
            title="Сначала выберите филиал"
            description="После выбора филиала здесь появятся его входящие лиды."
          />
        ) : leads.length === 0 ? (
          <EmptyState
            title="Лидов пока нет"
            description="Создайте первого лида для выбранного филиала."
            action={
              <Button type="button" size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4" />
                Новый лид
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead>Родитель</TableHead><TableHead>Телефон</TableHead><TableHead>Дети</TableHead><TableHead>Статус</TableHead><TableHead>Создан</TableHead></TableRow></TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-sm font-medium text-slate-900">
                      {lead.parentName}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{lead.phone}</TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {lead.children.length}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0066cc]">
                        {statusLabel(lead.status)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatDate(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>

      {showCreateModal ? (
        <CreateLeadModal
          branches={branches}
          initialBranchId={selectedBranchId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={refreshLeads}
        />
      ) : null}
    </PageShell>
  );
};

export default DispatcherLeadsPage;
