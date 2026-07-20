import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowPathIcon,
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../../shared/AuthContext";
import { getApiErrorMessage } from "../../../shared/api";
import { formatPhoneInput } from "../../../shared/phone";
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
import { useAdminBranch } from "../BranchContext";
import { ContractsApi } from "./contracts.api";
import type {
  CancelContractRequest,
  CancelReasonCode,
  ContractDetails,
  ContractListItem,
  ContractPaymentItem,
  ContractPaymentStatus,
  ContractGroupOption,
  ContractParticipantOption,
  ContractStatus,
  ContractsListQuery,
  CreateContractPaymentRequest,
  CreateContractRequest,
  ExtendContractRequest,
  LeadType,
  PaymentMethod,
  UpdateContractRequest,
} from "./contracts.types";

type FilterStatus = ContractStatus | "all" | "ENDING_SOON";
type DrawerMode = "view" | "edit" | "extend" | "cancel" | "create";
type PaymentModalMode = "create" | "cancel";

const CONTRACT_STATUS_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: "all", label: "Все" },
  { value: "ACTIVE", label: "Активны" },
  { value: "UPCOMING", label: "Скоро старт" },
  { value: "ENDING_SOON", label: "Скоро истекают" },
  { value: "EXPIRED", label: "Истекли" },
  { value: "CANCELLED", label: "Отменены" },
];

const LEAD_TYPE_OPTIONS: Array<{ value: LeadType | "all"; label: string }> = [
  { value: "all", label: "Все" },
  { value: "CHILDREN", label: "Детская группа" },
  { value: "ADULT", label: "Взрослая группа" },
];

const statusLabel = (status: ContractStatus) => {
  switch (status) {
    case "DRAFT":
      return "Черновик";
    case "UPCOMING":
      return "Скоро начнется";
    case "ACTIVE":
      return "Активен";
    case "EXPIRED":
      return "Истек";
    case "CANCELLED":
      return "Отменен";
    default:
      return status;
  }
};

const statusBadgeClassName = (status: ContractStatus) => {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-100 bg-emerald-50 text-emerald-800";
    case "UPCOMING":
      return "border-cyan-100 bg-cyan-50 text-cyan-800";
    case "EXPIRED":
      return "border-amber-100 bg-amber-50 text-amber-800";
    case "CANCELLED":
      return "border-rose-100 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

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

const formatAmount = (value: number, currency = "KZT") =>
  `${new Intl.NumberFormat("ru-RU").format(value)} ${currency}`;

const toDateTimeLocalValue = (value: Date) => {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(
    value.getHours()
  )}:${pad(value.getMinutes())}`;
};

const sanitizeNumberInput = (value: string) => value.replace(/\D/g, "");

const daysUntil = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
};

const isEndingSoon = (contract: { status: ContractStatus; endDate: string }) => {
  if (contract.status !== "ACTIVE") return false;
  const days = daysUntil(contract.endDate);
  return days !== null && days >= 0 && days <= 14;
};

const paymentStatusLabel = (status?: ContractPaymentStatus) => {
  switch (status) {
    case "PAID":
      return "Оплачен";
    case "PARTIALLY_PAID":
      return "Частично оплачен";
    case "UNPAID":
      return "Ожидает оплату";
    default:
      return "Нет данных";
  }
};

const paymentStatusBadgeClassName = (status?: ContractPaymentStatus) => {
  switch (status) {
    case "PAID":
      return "border-emerald-100 bg-emerald-50 text-emerald-800";
    case "PARTIALLY_PAID":
      return "border-amber-100 bg-amber-50 text-amber-800";
    case "UNPAID":
      return "border-cyan-100 bg-cyan-50 text-cyan-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
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

const paymentRecordStatusLabel = (status: ContractPaymentItem["status"]) =>
  status === "CANCELLED" ? "Отменен" : "Зафиксирован";

const defaultFormState = {
  createMode: "existing" as "existing" | "new",
  contractNumber: "",
  participantId: "",
  primaryContactId: "",
  leadType: "CHILDREN" as LeadType,
  participantFullName: "",
  participantBirthDate: "",
  contactFullName: "",
  contactPhone: "",
  contactEmail: "",
  groupId: "",
  coachId: "",
  startDate: "",
  endDate: "",
  amount: "30000",
  currency: "KZT",
  notes: "",
};

const ContractsPage: React.FC = () => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId, branchName } = useAdminBranch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedContractIdRef = useRef<string | null>(null);
  const autoOpenedPaymentRef = useRef<string | null>(null);

  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [leadTypeFilter, setLeadTypeFilter] = useState<LeadType | "all">("all");
  const [selectedContract, setSelectedContract] = useState<ContractDetails | null>(null);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [participants, setParticipants] = useState<ContractParticipantOption[]>([]);
  const [groups, setGroups] = useState<ContractGroupOption[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultFormState);
  const [cancelReasonCode, setCancelReasonCode] = useState<CancelReasonCode>("CLIENT_REQUEST");
  const [cancelComment, setCancelComment] = useState("");
  const [extendEndDate, setExtendEndDate] = useState("");
  const [extendAmount, setExtendAmount] = useState("");
  const [extendNotes, setExtendNotes] = useState("");
  const [contractPayments, setContractPayments] = useState<ContractPaymentItem[]>([]);
  const [contractPaymentsLoading, setContractPaymentsLoading] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState<PaymentModalMode | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<ContractPaymentItem | null>(null);
  const [paymentModalError, setPaymentModalError] = useState<string | null>(null);
  const [paymentSubmitLoading, setPaymentSubmitLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "KASPI" as PaymentMethod,
    paidAt: toDateTimeLocalValue(new Date()),
    comment: "",
    externalReference: "",
  });
  const [cancelPaymentReason, setCancelPaymentReason] = useState("");
  const [cancelPaymentComment, setCancelPaymentComment] = useState("");

  const loadContracts = async (mode: "initial" | "refresh" = "initial") => {
    if (!token) return;
    if (mode === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      const query: ContractsListQuery = { branchId: branchId ?? undefined };
      const response = await ContractsApi.list(query, token);
      setContracts(response.content);
    } catch (err) {
      console.error(err);
      setError(getApiErrorMessage(err, "Не удалось загрузить контракты"));
      setContracts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadContractPayments = async (contractId: string) => {
    if (!token) return;
    setContractPaymentsLoading(true);
    try {
      const payments = await ContractsApi.listPayments(contractId, token);
      setContractPayments(payments);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Не удалось загрузить платежи"));
      setContractPayments([]);
    } finally {
      setContractPaymentsLoading(false);
    }
  };

  const refreshSelectedContract = async (contractId: string) => {
    if (!token) return;
    const [details, payments] = await Promise.all([
      ContractsApi.getById(contractId, token),
      ContractsApi.listPayments(contractId, token),
    ]);
    setSelectedContract(details);
    setContractPayments(payments);
    setContracts((prev) => prev.map((item) => (item.id === details.id ? { ...item, ...details } : item)));
  };

  const loadParticipants = async () => {
    if (!token || !branchId) return;
    setParticipantsLoading(true);
    try {
      const result = await ContractsApi.listParticipants(branchId, token);
      setParticipants(result);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Не удалось загрузить участников"));
    } finally {
      setParticipantsLoading(false);
    }
  };

  const loadGroups = async (leadType: LeadType) => {
    if (!token || !branchId) return;
    setGroupsLoading(true);
    try {
      const result = await ContractsApi.listGroups(branchId, leadType, token);
      setGroups(result);
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Не удалось загрузить группы"));
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    void loadContracts();
  }, [branchId, token]);

  useEffect(() => {
    const contractIdFromQuery = searchParams.get("contractId");
    const modeFromQuery = searchParams.get("mode");
    if (!token || !branchId || !contractIdFromQuery) return;
    if (!contracts.some((contract) => contract.id === contractIdFromQuery)) return;
    if (autoOpenedContractIdRef.current === `${contractIdFromQuery}:${modeFromQuery ?? "view"}`) return;

    autoOpenedContractIdRef.current = `${contractIdFromQuery}:${modeFromQuery ?? "view"}`;
    void openView(
      contractIdFromQuery,
      modeFromQuery === "edit" || modeFromQuery === "extend" || modeFromQuery === "cancel"
        ? modeFromQuery
        : "view"
    );
  }, [branchId, contracts, searchParams, token]);

  useEffect(() => {
    const contractIdFromQuery = searchParams.get("contractId");
    const paymentAction = searchParams.get("payment");
    if (!selectedContract || drawerMode !== "view") return;
    if (paymentAction !== "create") return;
    if (contractIdFromQuery !== selectedContract.id) return;
    if (autoOpenedPaymentRef.current === selectedContract.id) return;

    autoOpenedPaymentRef.current = selectedContract.id;
    openCreatePayment();
  }, [drawerMode, searchParams, selectedContract]);

  const filteredContracts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contracts.filter((contract) => {
      if (statusFilter !== "all") {
        if (statusFilter === "ENDING_SOON") {
          if (!isEndingSoon(contract)) return false;
        } else if (contract.status !== statusFilter) {
          return false;
        }
      }

      if (leadTypeFilter !== "all" && contract.leadType !== leadTypeFilter) {
        return false;
      }

      if (!term) return true;
      const haystack = [
        contract.contractNumber,
        contract.participant.fullName,
        contract.primaryContact.fullName,
        contract.primaryContact.phone,
        contract.group.name,
        contract.coach?.fullName,
        contract.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [contracts, leadTypeFilter, search, statusFilter]);

  const summary = useMemo(
    () => ({
      active: contracts.filter((item) => item.status === "ACTIVE").length,
      upcoming: contracts.filter((item) => item.status === "UPCOMING").length,
      endingSoon: contracts.filter(isEndingSoon).length,
      expired: contracts.filter((item) => item.status === "EXPIRED").length,
      cancelled: contracts.filter((item) => item.status === "CANCELLED").length,
    }),
    [contracts]
  );

  const resetCreateForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    setForm({
      ...defaultFormState,
      startDate: today,
      endDate: end.toISOString().slice(0, 10),
    });
    setModalError(null);
  };

  const openCreate = async () => {
    resetCreateForm();
    setDrawerMode("create");
    setSelectedContract(null);
    await loadParticipants();
    await loadGroups("CHILDREN");
  };

  const openView = async (contractId: string, mode: Exclude<DrawerMode, "create"> = "view") => {
    if (!token) return;
    try {
      const [details, payments] = await Promise.all([
        ContractsApi.getById(contractId, token),
        ContractsApi.listPayments(contractId, token),
      ]);
      setSelectedContract(details);
      setContractPayments(payments);
      setDrawerMode(mode);
      setModalError(null);
      setPaymentModalError(null);
      setPaymentModalMode(null);
      setSelectedPayment(null);
      if (mode === "edit") {
        setForm({
          createMode: "existing",
          contractNumber: details.contractNumber,
          participantId: details.participant.id,
          primaryContactId: details.primaryContact.id,
          leadType: details.leadType,
          participantFullName: details.participant.fullName,
          participantBirthDate: details.participant.birthDate ?? "",
          contactFullName: details.primaryContact.fullName,
          contactPhone: details.primaryContact.phone,
          contactEmail: details.primaryContact.email ?? "",
          groupId: details.group.id,
          coachId: details.coach?.id ?? "",
          startDate: details.startDate,
          endDate: details.endDate,
          amount: String(details.amount),
          currency: details.currency,
          notes: details.notes ?? "",
        });
        await loadParticipants();
        await loadGroups(details.leadType);
      }
      if (mode === "extend") {
        setExtendEndDate(details.endDate);
        setExtendAmount(String(details.amount));
        setExtendNotes("");
      }
      if (mode === "cancel") {
        setCancelReasonCode("CLIENT_REQUEST");
        setCancelComment("");
      }
    } catch (err) {
      console.error(err);
      toast.error(getApiErrorMessage(err, "Не удалось открыть контракт"));
    }
  };

  const selectedParticipant = useMemo(
    () => participants.find((item) => item.id === form.participantId) ?? null,
    [form.participantId, participants]
  );

  useEffect(() => {
    if (drawerMode !== "create") return;
    if (!selectedParticipant) return;
    setForm((prev) => ({
      ...prev,
      leadType: selectedParticipant.leadType,
      primaryContactId: selectedParticipant.primaryContact.id,
      participantFullName: selectedParticipant.fullName,
      participantBirthDate: selectedParticipant.birthDate ?? "",
      contactFullName: selectedParticipant.primaryContact.fullName,
      contactPhone: selectedParticipant.primaryContact.phone,
      contactEmail: selectedParticipant.primaryContact.email ?? "",
      groupId:
        prev.leadType !== selectedParticipant.leadType ? "" : prev.groupId,
    }));
    void loadGroups(selectedParticipant.leadType);
  }, [drawerMode, selectedParticipant?.id]);

  useEffect(() => {
    if (!form.groupId) return;
    const group = groups.find((item) => item.id === form.groupId);
    if (!group) return;
    setForm((prev) => ({ ...prev, coachId: group.coach?.id ?? "" }));
  }, [form.groupId, groups]);

  useEffect(() => {
    if (drawerMode !== "create") return;
    if (form.createMode !== "new") return;
    void loadGroups(form.leadType);
  }, [drawerMode, form.createMode, form.leadType]);

  const formErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (drawerMode === "create" && form.createMode === "new") {
      if (!form.participantFullName.trim()) errors.participantFullName = "Укажите участника";
      if (!form.participantBirthDate) errors.participantBirthDate = "Укажите дату рождения";
      if (!form.contactFullName.trim()) errors.contactFullName = "Укажите контактное лицо";
      if (!form.contactPhone.trim()) errors.contactPhone = "Укажите телефон";
    } else {
      if (!form.participantId) errors.participantId = "Выберите участника";
    }
    if (!form.groupId) errors.groupId = "Выберите группу";
    if (!form.startDate) errors.startDate = "Укажите дату начала";
    if (!form.endDate) errors.endDate = "Укажите дату окончания";
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      errors.endDate = "Дата окончания должна быть не раньше даты начала";
    }
    if (!form.amount.trim() || Number(form.amount) < 0) {
      errors.amount = "Сумма должна быть 0 или больше";
    }
    return errors;
  }, [drawerMode, form]);

  const saveContract = async () => {
    if (!token || !branchId) return;
    if (Object.keys(formErrors).length > 0) return;
    setSubmitLoading(true);
    setModalError(null);

    try {
      if (drawerMode === "create") {
        const payload: CreateContractRequest = {
          branchId,
          leadType: form.leadType,
          participantId: form.createMode === "existing" ? form.participantId : undefined,
          primaryContactId: form.createMode === "existing" ? form.primaryContactId : undefined,
          participantDraft:
            form.createMode === "new"
              ? {
                  fullName: form.participantFullName.trim(),
                  birthDate: form.participantBirthDate,
                }
              : undefined,
          primaryContactDraft:
            form.createMode === "new"
              ? {
                  fullName: form.contactFullName.trim(),
                  phone: form.contactPhone.trim(),
                  email: form.contactEmail.trim() || undefined,
                }
              : undefined,
          groupId: form.groupId,
          coachId: form.coachId || null,
          contractNumber: form.contractNumber || undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          amount: Number(form.amount),
          currency: form.currency,
          notes: form.notes.trim() || undefined,
        };
        const result = await ContractsApi.create(payload, token);
        if ("valid" in result && !result.valid) {
          setModalError(result.errors.map((error) => error.message).join("\n"));
          return;
        }
        toast.success("Контракт создан");
      } else if (selectedContract) {
        const payload: UpdateContractRequest = {
          branchId,
          leadType: form.leadType,
          participantId: form.participantId,
          primaryContactId: form.primaryContactId,
          groupId: form.groupId,
          coachId: form.coachId || null,
          contractNumber: form.contractNumber || undefined,
          startDate: form.startDate,
          endDate: form.endDate,
          amount: Number(form.amount),
          currency: form.currency,
          notes: form.notes.trim() || undefined,
        };
        const result = await ContractsApi.update(selectedContract.id, payload, token);
        if ("valid" in result && !result.valid) {
          setModalError(result.errors.map((error) => error.message).join("\n"));
          return;
        }
        toast.success("Контракт обновлен");
      }

      setDrawerMode(null);
      await loadContracts("refresh");
    } catch (err) {
      console.error(err);
      setModalError(getApiErrorMessage(err, "Не удалось сохранить контракт"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!token || !selectedContract) return;
    setSubmitLoading(true);
    setModalError(null);
    try {
      const payload: ExtendContractRequest = {
        endDate: extendEndDate,
        amount: extendAmount.trim() ? Number(extendAmount) : undefined,
        notes: extendNotes.trim() || undefined,
      };
      await ContractsApi.extend(selectedContract.id, payload, token);
      toast.success("Контракт продлен");
      setDrawerMode(null);
      await loadContracts("refresh");
    } catch (err) {
      console.error(err);
      setModalError(getApiErrorMessage(err, "Не удалось продлить контракт"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!token || !selectedContract) return;
    setSubmitLoading(true);
    setModalError(null);
    try {
      const payload: CancelContractRequest = {
        reasonCode: cancelReasonCode,
        comment: cancelComment.trim() || undefined,
      };
      await ContractsApi.cancel(selectedContract.id, payload, token);
      toast.success("Контракт отменен");
      setDrawerMode(null);
      await loadContracts("refresh");
    } catch (err) {
      console.error(err);
      setModalError(getApiErrorMessage(err, "Не удалось отменить контракт"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const openCreatePayment = () => {
    if (!selectedContract) return;
    setPaymentForm({
      amount: String(
        Math.max(
          0,
          selectedContract.outstandingAmount ?? selectedContract.amount - (selectedContract.paidAmount ?? 0)
        )
      ),
      method: "KASPI",
      paidAt: toDateTimeLocalValue(new Date()),
      comment: "",
      externalReference: "",
    });
    setPaymentModalError(null);
    setPaymentModalMode("create");
  };

  const closeDrawer = () => {
    autoOpenedContractIdRef.current = null;
    autoOpenedPaymentRef.current = null;
    setDrawerMode(null);
    setSelectedContract(null);
    setContractPayments([]);
    setPaymentModalMode(null);
    setSelectedPayment(null);
    setPaymentModalError(null);
    if (searchParams.get("contractId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("contractId");
      nextParams.delete("mode");
      nextParams.delete("payment");
      setSearchParams(nextParams, { replace: true });
    }
  };

  const openCancelPayment = (payment: ContractPaymentItem) => {
    setSelectedPayment(payment);
    setCancelPaymentReason("");
    setCancelPaymentComment("");
    setPaymentModalError(null);
    setPaymentModalMode("cancel");
  };

  const handleCreatePayment = async () => {
    if (!token || !selectedContract) return;
    if (!paymentForm.amount.trim() || Number(paymentForm.amount) <= 0) {
      setPaymentModalError("Сумма должна быть больше 0");
      return;
    }
    if (!paymentForm.paidAt) {
      setPaymentModalError("Укажите дату и время оплаты");
      return;
    }
    setPaymentSubmitLoading(true);
    setPaymentModalError(null);
    try {
      const payload: CreateContractPaymentRequest = {
        contractId: selectedContract.id,
        amount: Number(paymentForm.amount),
        currency: selectedContract.currency,
        method: paymentForm.method,
        paidAt: new Date(paymentForm.paidAt).toISOString(),
        comment: paymentForm.comment.trim() || undefined,
        externalReference: paymentForm.externalReference.trim() || undefined,
      };
      await ContractsApi.createPayment(payload, token);
      toast.success("Платеж добавлен");
      setPaymentModalMode(null);
      await Promise.all([loadContracts("refresh"), refreshSelectedContract(selectedContract.id)]);
    } catch (err) {
      console.error(err);
      setPaymentModalError(getApiErrorMessage(err, "Не удалось добавить платеж"));
    } finally {
      setPaymentSubmitLoading(false);
    }
  };

  const handleCancelPayment = async () => {
    if (!token || !selectedContract || !selectedPayment) return;
    if (!cancelPaymentReason.trim()) {
      setPaymentModalError("Укажите причину отмены");
      return;
    }
    setPaymentSubmitLoading(true);
    setPaymentModalError(null);
    try {
      await ContractsApi.cancelPayment(selectedPayment.id, {
        reason: cancelPaymentReason.trim(),
        comment: cancelPaymentComment.trim() || undefined,
      }, token);
      toast.success("Платеж отменен");
      setPaymentModalMode(null);
      setSelectedPayment(null);
      await Promise.all([loadContracts("refresh"), refreshSelectedContract(selectedContract.id)]);
    } catch (err) {
      console.error(err);
      setPaymentModalError(getApiErrorMessage(err, "Не удалось отменить платеж"));
    } finally {
      setPaymentSubmitLoading(false);
    }
  };

  if (!token) {
    return <ErrorState message="Нет авторизации" />;
  }

  return (
    <PageShell>
      <PageHeader
        title="Контракты"
        description={`Оформление, продление и контроль договоров${branchName ? ` по филиалу ${branchName}` : ""}.`}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => void loadContracts("refresh")} isLoading={refreshing}>
              <ArrowPathIcon className="h-4 w-4" />
              Обновить
            </Button>
            <Button type="button" onClick={() => void openCreate()} disabled={!branchId}>
              <PlusIcon className="h-4 w-4" />
              Создать контракт
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MetricCard label="Активны" value={summary.active} tone="success" />
        <MetricCard label="Скоро старт" value={summary.upcoming} tone="info" />
        <MetricCard label="Скоро истекают" value={summary.endingSoon} tone="warning" />
        <MetricCard label="Истекли" value={summary.expired} tone="danger" />
        <MetricCard label="Отменены" value={summary.cancelled} />
      </div>

      <SectionCard
        title="Фильтры"
        description="Поиск по номеру, участнику, контакту, телефону, группе или ID договора."
        icon={<CalendarDaysIcon className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Найти контракт"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          >
            {CONTRACT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={leadTypeFilter}
            onChange={(event) => setLeadTypeFilter(event.target.value as LeadType | "all")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          >
            {LEAD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </SectionCard>

      <SectionCard
        title="Журнал договоров"
        description="Полный список с быстрыми переходами в договор и карточку ученика."
        icon={<DocumentTextIcon className="h-4 w-4" />}
      >
        {error ? (
          <ErrorState message={error} onRetry={() => void loadContracts("refresh")} />
        ) : loading ? (
          <LoadingState label="Загрузка контрактов..." />
        ) : filteredContracts.length === 0 ? (
          <EmptyState
            title="Контракты не найдены"
            description="Измените фильтры или создайте новый договор."
            action={
              <Button type="button" onClick={() => void openCreate()} disabled={!branchId}>
                <PlusIcon className="h-4 w-4" />
                Создать контракт
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Договор</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Участник / контакт</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Группа</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Период</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Сумма</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Статус договора</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Оплата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{contract.contractNumber}</div>
                      <div className="mt-1 text-xs text-slate-500">{contract.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{contract.participant.fullName}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Контакт: {contract.primaryContact.fullName} · {contract.primaryContact.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div>{contract.group.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {contract.coach?.fullName || "Тренер не указан"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div>{formatDate(contract.startDate)}</div>
                      <div className="mt-1 text-xs text-slate-500">до {formatDate(contract.endDate)}</div>
                      {isEndingSoon(contract) ? (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                          Истекает скоро
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{formatAmount(contract.amount, contract.currency)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        Оплачено: {formatAmount(contract.paidAmount ?? 0, contract.currency)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Остаток: {formatAmount(contract.outstandingAmount ?? contract.amount, contract.currency)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClassName(contract.status)}`}>
                        {statusLabel(contract.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatusBadgeClassName(
                          contract.paymentStatus
                        )}`}
                      >
                        {paymentStatusLabel(contract.paymentStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton icon={<EyeIcon className="h-4 w-4" />} label="Открыть" onClick={() => void openView(contract.id, "view")} />
                        <ActionButton
                          icon={<UserCircleIcon className="h-4 w-4" />}
                          label="Ученик"
                          onClick={() => navigate(`/admin/students/${encodeURIComponent(contract.participant.id)}/overview`)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {drawerMode === "create" || drawerMode === "edit" ? (
        <ContractFormModal
          mode={drawerMode}
          branchName={branchName}
          participants={participants}
          groups={groups}
          participantsLoading={participantsLoading}
          groupsLoading={groupsLoading}
          form={form}
          setForm={setForm}
          selectedParticipant={selectedParticipant}
          errors={formErrors}
          submitLoading={submitLoading}
          modalError={modalError}
          onClose={closeDrawer}
          onSubmit={() => void saveContract()}
        />
      ) : null}

      {drawerMode === "view" && selectedContract ? (
        <ContractDetailsModal
          contract={selectedContract}
          payments={contractPayments}
          paymentsLoading={contractPaymentsLoading}
          onRefresh={() => void refreshSelectedContract(selectedContract.id)}
          onCreatePayment={openCreatePayment}
          onCancelPayment={openCancelPayment}
          onEditContract={() => void openView(selectedContract.id, "edit")}
          onExtendContract={() => void openView(selectedContract.id, "extend")}
          onCancelContract={() => void openView(selectedContract.id, "cancel")}
          onOpenStudent={() =>
            navigate(`/admin/students/${encodeURIComponent(selectedContract.participant.id)}/overview`)
          }
          onClose={closeDrawer}
        />
      ) : null}

      {drawerMode === "extend" && selectedContract ? (
        <ContractExtendModal
          contract={selectedContract}
          endDate={extendEndDate}
          amount={extendAmount}
          notes={extendNotes}
          setEndDate={setExtendEndDate}
          setAmount={setExtendAmount}
          setNotes={setExtendNotes}
          submitLoading={submitLoading}
          modalError={modalError}
          onClose={closeDrawer}
          onSubmit={() => void handleExtend()}
        />
      ) : null}

      {drawerMode === "cancel" && selectedContract ? (
        <ContractCancelModal
          contract={selectedContract}
          reasonCode={cancelReasonCode}
          comment={cancelComment}
          setReasonCode={setCancelReasonCode}
          setComment={setCancelComment}
          submitLoading={submitLoading}
          modalError={modalError}
          onClose={closeDrawer}
          onSubmit={() => void handleCancel()}
        />
      ) : null}

      {paymentModalMode === "create" && selectedContract ? (
        <CreatePaymentModal
          contract={selectedContract}
          form={paymentForm}
          setForm={setPaymentForm}
          submitLoading={paymentSubmitLoading}
          modalError={paymentModalError}
          onClose={() => setPaymentModalMode(null)}
          onSubmit={() => void handleCreatePayment()}
        />
      ) : null}

      {paymentModalMode === "cancel" && selectedContract && selectedPayment ? (
        <CancelPaymentModal
          contract={selectedContract}
          payment={selectedPayment}
          reason={cancelPaymentReason}
          comment={cancelPaymentComment}
          setReason={setCancelPaymentReason}
          setComment={setCancelPaymentComment}
          submitLoading={paymentSubmitLoading}
          modalError={paymentModalError}
          onClose={() => {
            setPaymentModalMode(null);
            setSelectedPayment(null);
          }}
          onSubmit={() => void handleCancelPayment()}
        />
      ) : null}
    </PageShell>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}> = ({ label, value, tone = "neutral" }) => {
  const valueClass =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
      ? "text-amber-700"
      : tone === "danger"
      ? "text-rose-700"
      : tone === "info"
      ? "text-cyan-700"
      : "text-slate-900";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
};

const ActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon, label, onClick, danger = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
      danger
        ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    }`}
  >
    {icon}
    {label}
  </button>
);

const ContractFormModal: React.FC<{
  mode: "create" | "edit";
  branchName: string | null;
  participants: ContractParticipantOption[];
  groups: ContractGroupOption[];
  participantsLoading: boolean;
  groupsLoading: boolean;
  form: typeof defaultFormState;
  setForm: React.Dispatch<React.SetStateAction<typeof defaultFormState>>;
  selectedParticipant: ContractParticipantOption | null;
  errors: Record<string, string>;
  submitLoading: boolean;
  modalError: string | null;
  onClose: () => void;
  onSubmit: () => void;
}> = ({
  mode,
  branchName,
  participants,
  groups,
  participantsLoading,
  groupsLoading,
  form,
  setForm,
  selectedParticipant,
  errors,
  submitLoading,
  modalError,
  onClose,
  onSubmit,
}) => {
  const isCreate = mode === "create";
  const [setupLeadType, setSetupLeadType] = useState<LeadType | null>(null);
  const [setupCreateMode, setSetupCreateMode] = useState<"existing" | "new" | null>(null);
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const isNewParticipant = isCreate && form.createMode === "new";
  const isAdultNewParticipant = isNewParticipant && form.leadType === "ADULT";
  const showFormFields = !isCreate || setupConfirmed;

  const applySetup = () => {
    if (!setupLeadType || !setupCreateMode) return;
    setForm((prev) => ({
      ...prev,
      leadType: setupLeadType,
      createMode: setupCreateMode,
      groupId: "",
      coachId: "",
      participantId: "",
      primaryContactId: "",
      participantFullName: "",
      participantBirthDate: "",
      contactFullName: "",
      contactPhone: "",
      contactEmail: "",
    }));
    setSetupConfirmed(true);
  };

  const resetSetup = () => {
    setSetupLeadType(form.leadType);
    setSetupCreateMode(form.createMode);
    setSetupConfirmed(false);
  };

  return (
    <ModalShell
      title={mode === "create" ? "Создать контракт" : "Изменить контракт"}
      description={`Оформление договора${branchName ? ` для филиала ${branchName}` : ""}.`}
      eyebrow="Контракты"
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          {showFormFields ? (
            <Button type="button" onClick={onSubmit} isLoading={submitLoading}>
              {mode === "create" ? "Создать" : "Сохранить"}
            </Button>
          ) : (
            <Button type="button" onClick={applySetup} disabled={!setupLeadType || !setupCreateMode}>
              Продолжить
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {isCreate && !setupConfirmed ? (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div>
              <div className="text-sm font-semibold text-slate-900">Шаг 1. Выберите формат контракта</div>
              <div className="mt-1 text-sm text-slate-500">
                Сначала определим группу и сценарий. Остальные поля покажем только после выбора.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Тип группы</div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "CHILDREN" as LeadType, label: "Детская группа", hint: "Ребенок и контактное лицо" },
                    { value: "ADULT" as LeadType, label: "Взрослая группа", hint: "Игрок может быть сразу клиентом" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSetupLeadType(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        setupLeadType === option.value
                          ? "border-cyan-700 bg-cyan-700 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300"
                      }`}
                    >
                      <div className="text-sm font-semibold">{option.label}</div>
                      <div className={`mt-1 text-xs ${setupLeadType === option.value ? "text-cyan-50" : "text-slate-500"}`}>
                        {option.hint}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Клиент</div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { value: "existing" as const, label: "Существующий клиент", hint: "Выберем участника из базы" },
                    { value: "new" as const, label: "Новый клиент", hint: "Создадим нового участника в процессе" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSetupCreateMode(option.value)}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        setupCreateMode === option.value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="text-sm font-semibold">{option.label}</div>
                      <div className={`mt-1 text-xs ${setupCreateMode === option.value ? "text-slate-200" : "text-slate-500"}`}>
                        {option.hint}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {isCreate && setupConfirmed ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Шаг 1 завершен</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {form.leadType === "ADULT" ? "Взрослая группа" : "Детская группа"} ·{" "}
                {form.createMode === "existing" ? "Существующий клиент" : "Новый клиент"}
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={resetSetup}>
              Изменить выбор
            </Button>
          </div>
        ) : null}

        {showFormFields ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isCreate && form.createMode === "existing" ? (
              <>
                <label className="space-y-1 text-sm text-slate-600 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Участник</span>
                  <select
                    value={form.participantId}
                    onChange={(event) => setForm((prev) => ({ ...prev, participantId: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                    disabled={participantsLoading}
                  >
                    <option value="">Выберите участника</option>
                    {participants
                      .filter((participant) => participant.leadType === form.leadType)
                      .map((participant) => (
                        <option key={participant.id} value={participant.id}>
                          {participant.fullName}
                        </option>
                      ))}
                  </select>
                  {errors.participantId ? <p className="text-xs text-rose-600">{errors.participantId}</p> : null}
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Контакт</span>
                  <input
                    type="text"
                    value={selectedParticipant?.primaryContact.fullName ?? ""}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Телефон</span>
                  <input
                    type="text"
                    value={selectedParticipant?.primaryContact.phone ?? ""}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                  />
                </label>
              </>
            ) : null}

            {isNewParticipant ? (
              <>
                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {form.leadType === "ADULT" ? "Игрок" : "Ребенок"}
                  </span>
                  <input
                    type="text"
                    value={form.participantFullName}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        participantFullName: value,
                        contactFullName:
                          prev.leadType === "ADULT" &&
                          (!prev.contactFullName.trim() || prev.contactFullName === prev.participantFullName)
                            ? value
                            : prev.contactFullName,
                      }));
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                    placeholder={form.leadType === "ADULT" ? "ФИО игрока" : "ФИО ребенка"}
                  />
                  {errors.participantFullName ? <p className="text-xs text-rose-600">{errors.participantFullName}</p> : null}
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Дата рождения</span>
                  <input
                    type="date"
                    value={form.participantBirthDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, participantBirthDate: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                  />
                  {errors.participantBirthDate ? <p className="text-xs text-rose-600">{errors.participantBirthDate}</p> : null}
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {isAdultNewParticipant ? "ФИО контакта" : "Родитель / контакт"}
                  </span>
                  <input
                    type="text"
                    value={form.contactFullName}
                    onChange={(event) => setForm((prev) => ({ ...prev, contactFullName: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                    placeholder={isAdultNewParticipant ? "Обычно совпадает с игроком" : "ФИО родителя"}
                  />
                  {errors.contactFullName ? <p className="text-xs text-rose-600">{errors.contactFullName}</p> : null}
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Телефон</span>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        contactPhone: formatPhoneInput(event.target.value),
                      }))
                    }
                    inputMode="tel"
                    autoComplete="tel"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                    placeholder="+7 777 123 45 67"
                  />
                  {errors.contactPhone ? <p className="text-xs text-rose-600">{errors.contactPhone}</p> : null}
                </label>

                <label className="space-y-1 text-sm text-slate-600 md:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</span>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                    placeholder="optional@example.com"
                  />
                </label>
              </>
            ) : null}

            {mode === "edit" ? (
              <>
                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Участник</span>
                  <input
                    type="text"
                    value={form.participantFullName}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                  />
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Контакт</span>
                  <input
                    type="text"
                    value={form.contactFullName}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
                  />
                </label>
              </>
            ) : null}

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Группа</span>
              <select
                value={form.groupId}
                onChange={(event) => setForm((prev) => ({ ...prev, groupId: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                disabled={groupsLoading}
              >
                <option value="">Выберите группу</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {errors.groupId ? <p className="text-xs text-rose-600">{errors.groupId}</p> : null}
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Тренер</span>
              <input
                type="text"
                value={groups.find((group) => group.id === form.groupId)?.coach?.fullName ?? "Будет назначен по группе"}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600"
              />
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Номер договора</span>
              <input
                type="text"
                value={form.contractNumber}
                onChange={(event) => setForm((prev) => ({ ...prev, contractNumber: event.target.value }))}
                readOnly={mode === "edit"}
                className={`w-full rounded-xl border px-3 py-2.5 outline-none transition ${
                  mode === "edit"
                    ? "border-slate-200 bg-slate-50 text-slate-600"
                    : "border-slate-200 bg-white focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                }`}
                placeholder={mode === "create" ? "Можно оставить пустым для авто-номера" : ""}
              />
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Сумма</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.amount}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    amount: sanitizeNumberInput(event.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
                placeholder="30000"
              />
              {errors.amount ? <p className="text-xs text-rose-600">{errors.amount}</p> : null}
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Дата начала</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              />
              {errors.startDate ? <p className="text-xs text-rose-600">{errors.startDate}</p> : null}
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Дата окончания</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              />
              {errors.endDate ? <p className="text-xs text-rose-600">{errors.endDate}</p> : null}
            </label>

            <label className="space-y-1 text-sm text-slate-600 md:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Комментарий</span>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              />
            </label>
          </div>
        ) : null}

        {modalError ? (
          <div className="whitespace-pre-line rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {modalError}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
};

const ContractDetailsModal: React.FC<{
  contract: ContractDetails;
  payments: ContractPaymentItem[];
  paymentsLoading: boolean;
  onRefresh: () => void;
  onCreatePayment: () => void;
  onCancelPayment: (payment: ContractPaymentItem) => void;
  onEditContract: () => void;
  onExtendContract: () => void;
  onCancelContract: () => void;
  onOpenStudent: () => void;
  onClose: () => void;
}> = ({
  contract,
  payments,
  paymentsLoading,
  onRefresh,
  onCreatePayment,
  onCancelPayment,
  onEditContract,
  onExtendContract,
  onCancelContract,
  onOpenStudent,
  onClose,
}) => (
  <ModalShell
    title={contract.contractNumber}
    description="Полная карточка договора и состояние оплаты."
    eyebrow="Контракт"
    onClose={onClose}
    maxWidthClassName="max-w-3xl"
    footer={
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
          <ArrowPathIcon className="h-4 w-4" />
          Обновить
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onOpenStudent}>
            <UserCircleIcon className="h-4 w-4" />
            Открыть ученика
          </Button>
          {contract.status !== "CANCELLED" && (contract.outstandingAmount ?? contract.amount) > 0 ? (
            <Button type="button" onClick={onCreatePayment}>
              <PlusIcon className="h-4 w-4" />
              Добавить платеж
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    }
  >
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <DetailBlock label="Участник" value={contract.participant.fullName} />
      <DetailBlock label="Контакт" value={`${contract.primaryContact.fullName} · ${contract.primaryContact.phone}`} />
      <DetailBlock label="Группа" value={contract.group.name} />
      <DetailBlock label="Тренер" value={contract.coach?.fullName || "Не указан"} />
      <DetailBlock label="Период" value={`${formatDate(contract.startDate)} - ${formatDate(contract.endDate)}`} />
      <DetailBlock label="Сумма" value={formatAmount(contract.amount, contract.currency)} />
    </div>

    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Управление договором</div>
          <div className="mt-1 text-xs text-slate-500">Редактирование, продление и отмена доступны из карточки.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ActionButton icon={<PencilSquareIcon className="h-4 w-4" />} label="Изменить" onClick={onEditContract} />
          <ActionButton icon={<DocumentDuplicateIcon className="h-4 w-4" />} label="Продлить" onClick={onExtendContract} />
          {contract.status !== "CANCELLED" ? (
            <ActionButton icon={<NoSymbolIcon className="h-4 w-4" />} label="Отменить" onClick={onCancelContract} danger />
          ) : null}
        </div>
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Оплата договора</div>
          <div className="mt-1 text-xs text-slate-500">Сводка по покрытию и история ручных платежей.</div>
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatusBadgeClassName(
            contract.paymentStatus
          )}`}
        >
          {paymentStatusLabel(contract.paymentStatus)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <DetailBlock label="Оплачено" value={formatAmount(contract.paidAmount ?? 0, contract.currency)} />
        <DetailBlock
          label="Осталось"
          value={formatAmount(contract.outstandingAmount ?? contract.amount, contract.currency)}
        />
        <DetailBlock label="Переплата" value={formatAmount(contract.overpaidAmount ?? 0, contract.currency)} />
        <DetailBlock label="Последний платеж" value={formatDateTime(contract.lastPaidAt)} />
      </div>

      <div className="mt-4">
        {paymentsLoading ? (
          <LoadingState label="Загрузка платежей..." />
        ) : payments.length === 0 ? (
          <EmptyState
            title="Платежей пока нет"
            description="Добавьте первый платеж, чтобы зафиксировать оплату по договору."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Сумма</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Метод</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Комментарий</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-slate-500">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="align-top">
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-medium text-slate-900">{formatDateTime(payment.paidAt)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {payment.recordedByName || payment.recordedBy || "Система"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatAmount(payment.amount, payment.currency)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{paymentMethodLabel(payment.method)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          payment.status === "CANCELLED"
                            ? "border-rose-100 bg-rose-50 text-rose-700"
                            : "border-emerald-100 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {paymentRecordStatusLabel(payment.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div>{payment.comment || "—"}</div>
                      {payment.externalReference ? (
                        <div className="mt-1 text-xs text-slate-500">
                          Номер чека / перевода: {payment.externalReference}
                        </div>
                      ) : null}
                      {payment.status === "CANCELLED" && payment.cancelReason ? (
                        <div className="mt-1 text-xs text-rose-600">
                          Отменен: {payment.cancelReason}
                          {payment.cancelComment ? ` · ${payment.cancelComment}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {payment.status !== "CANCELLED" ? (
                        <ActionButton
                          icon={<NoSymbolIcon className="h-4 w-4" />}
                          label="Отменить"
                          onClick={() => onCancelPayment(payment)}
                          danger
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">История</div>
      <div className="mt-3 space-y-3">
        {contract.history.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{item.type}</div>
            <div className="mt-1 text-xs text-slate-500">
              {formatDate(item.createdAt)} · {item.actorName}
            </div>
            {item.comment ? <div className="mt-2 text-xs text-slate-600">{item.comment}</div> : null}
          </div>
        ))}
      </div>
    </div>
  </ModalShell>
);

const CreatePaymentModal: React.FC<{
  contract: ContractDetails;
  form: {
    amount: string;
    method: PaymentMethod;
    paidAt: string;
    comment: string;
    externalReference: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      amount: string;
      method: PaymentMethod;
      paidAt: string;
      comment: string;
      externalReference: string;
    }>
  >;
  submitLoading: boolean;
  modalError: string | null;
  onClose: () => void;
  onSubmit: () => void;
}> = ({ contract, form, setForm, submitLoading, modalError, onClose, onSubmit }) => (
  <ModalShell
    title={`Новый платеж для ${contract.contractNumber}`}
    description="Фиксация ручной оплаты по текущему договору."
    eyebrow="Оплата"
    onClose={onClose}
    maxWidthClassName="max-w-xl"
    footer={
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" onClick={onSubmit} isLoading={submitLoading}>
          Добавить платеж
        </Button>
      </div>
    }
  >
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailBlock label="Сумма договора" value={formatAmount(contract.amount, contract.currency)} />
        <DetailBlock label="Оплачено" value={formatAmount(contract.paidAmount ?? 0, contract.currency)} />
        <DetailBlock
          label="Осталось"
          value={formatAmount(contract.outstandingAmount ?? contract.amount, contract.currency)}
        />
      </div>

      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Сумма</span>
        <input
          type="text"
          inputMode="numeric"
          value={form.amount}
          onChange={(event) => setForm((prev) => ({ ...prev, amount: sanitizeNumberInput(event.target.value) }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          placeholder="50000"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Метод</span>
          <select
            value={form.method}
            onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value as PaymentMethod }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          >
            <option value="KASPI">Kaspi</option>
            <option value="CARD">Карта</option>
            <option value="BANK_TRANSFER">Перевод</option>
            <option value="CASH">Наличные</option>
            <option value="OTHER">Другое</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm text-slate-600">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Дата и время оплаты</span>
          <input
            type="datetime-local"
            value={form.paidAt}
            onChange={(event) => setForm((prev) => ({ ...prev, paidAt: event.target.value }))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Номер чека / перевода</span>
        <input
          type="text"
          value={form.externalReference}
          onChange={(event) => setForm((prev) => ({ ...prev, externalReference: event.target.value }))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          placeholder="Например, номер Kaspi-чека"
        />
      </label>

      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Комментарий</span>
        <textarea
          value={form.comment}
          onChange={(event) => setForm((prev) => ({ ...prev, comment: event.target.value }))}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
        />
      </label>

      {modalError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {modalError}
        </div>
      ) : null}
    </div>
  </ModalShell>
);

const CancelPaymentModal: React.FC<{
  contract: ContractDetails;
  payment: ContractPaymentItem;
  reason: string;
  comment: string;
  setReason: (value: string) => void;
  setComment: (value: string) => void;
  submitLoading: boolean;
  modalError: string | null;
  onClose: () => void;
  onSubmit: () => void;
}> = ({ contract, payment, reason, comment, setReason, setComment, submitLoading, modalError, onClose, onSubmit }) => (
  <ModalShell
    title={`Отменить платеж по ${contract.contractNumber}`}
    description="Платеж останется в истории, но будет исключен из расчета покрытия."
    eyebrow="Отмена платежа"
    onClose={onClose}
    maxWidthClassName="max-w-xl"
    footer={
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Назад
        </Button>
        <Button type="button" variant="danger" onClick={onSubmit} isLoading={submitLoading}>
          Отменить платеж
        </Button>
      </div>
    }
  >
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DetailBlock label="Сумма" value={formatAmount(payment.amount, payment.currency)} />
        <DetailBlock label="Метод" value={paymentMethodLabel(payment.method)} />
        <DetailBlock label="Дата оплаты" value={formatDateTime(payment.paidAt)} />
      </div>

      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Причина</span>
        <input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          placeholder="duplicate payment"
        />
      </label>

      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Комментарий</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
        />
      </label>

      {modalError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {modalError}
        </div>
      ) : null}
    </div>
  </ModalShell>
);

const ContractExtendModal: React.FC<{
  contract: ContractDetails;
  endDate: string;
  amount: string;
  notes: string;
  setEndDate: (value: string) => void;
  setAmount: (value: string) => void;
  setNotes: (value: string) => void;
  submitLoading: boolean;
  modalError: string | null;
  onClose: () => void;
  onSubmit: () => void;
}> = ({
  contract,
  endDate,
  amount,
  notes,
  setEndDate,
  setAmount,
  setNotes,
  submitLoading,
  modalError,
  onClose,
  onSubmit,
}) => (
  <ModalShell
    title={`Продлить ${contract.contractNumber}`}
    description="Быстрое продление текущего договора."
    eyebrow="Продление"
    onClose={onClose}
    maxWidthClassName="max-w-xl"
    footer={
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button type="button" onClick={onSubmit} isLoading={submitLoading}>
          Продлить
        </Button>
      </div>
    }
  >
    <div className="space-y-4">
      <DetailBlock label="Участник" value={contract.participant.fullName} />
      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Новая дата окончания</span>
        <input
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
        />
      </label>
      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Сумма</span>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(sanitizeNumberInput(event.target.value))}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
          placeholder="32000"
        />
      </label>
      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Комментарий</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
        />
      </label>
      {modalError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {modalError}
        </div>
      ) : null}
    </div>
  </ModalShell>
);

const ContractCancelModal: React.FC<{
  contract: ContractDetails;
  reasonCode: CancelReasonCode;
  comment: string;
  setReasonCode: (value: CancelReasonCode) => void;
  setComment: (value: string) => void;
  submitLoading: boolean;
  modalError: string | null;
  onClose: () => void;
  onSubmit: () => void;
}> = ({
  contract,
  reasonCode,
  comment,
  setReasonCode,
  setComment,
  submitLoading,
  modalError,
  onClose,
  onSubmit,
}) => (
  <ModalShell
    title={`Отменить ${contract.contractNumber}`}
    description="Договор будет переведен в статус CANCELLED."
    eyebrow="Отмена"
    onClose={onClose}
    maxWidthClassName="max-w-xl"
    footer={
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          Назад
        </Button>
        <Button type="button" variant="danger" onClick={onSubmit} isLoading={submitLoading}>
          Отменить договор
        </Button>
      </div>
    }
  >
    <div className="space-y-4">
      <DetailBlock label="Участник" value={contract.participant.fullName} />
      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Причина</span>
        <select
          value={reasonCode}
          onChange={(event) => setReasonCode(event.target.value as CancelReasonCode)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
        >
          <option value="CLIENT_REQUEST">По просьбе клиента</option>
          <option value="PAYMENT_ISSUE">Проблема с оплатой</option>
          <option value="SCHEDULE_CONFLICT">Конфликт расписания</option>
          <option value="MEDICAL">Медицинская причина</option>
          <option value="OTHER">Другое</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm text-slate-600">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Комментарий</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={4}
          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
        />
      </label>
      {modalError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {modalError}
        </div>
      ) : null}
    </div>
  </ModalShell>
);

const DetailBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
    <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

export default ContractsPage;
