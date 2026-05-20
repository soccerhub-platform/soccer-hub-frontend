import React, { useEffect, useMemo, useState } from "react";
import { buttonStyles } from "../../../shared/ui/buttonStyles";
import { GroupApiModel } from "../groups/group.api";
import { LeadChild } from "./types";

interface ConvertLeadModalProps {
  isOpen: boolean;
  leadName: string;
  children: LeadChild[];
  groups: GroupApiModel[];
  loadingGroups: boolean;
  groupsError: string | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    childId: string;
    groupId: string;
    childBirthDate: string;
    contractStartDate: string;
    contractEndDate?: string | null;
    amount?: number | null;
  }) => Promise<void> | void;
}

const toIsoDate = (value: Date) => {
  const y = value.getFullYear();
  const m = `${value.getMonth() + 1}`.padStart(2, "0");
  const d = `${value.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const estimateBirthDate = (age?: number) => {
  if (!age || age <= 0) return "";
  const now = new Date();
  return `${now.getFullYear() - age}-01-01`;
};

const childDisplayLabel = (child: LeadChild) => {
  const parts = [child.childName];
  if (child.childAge) parts.push(`${child.childAge} лет`);
  if (child.gender === "MALE") parts.push("мальчик");
  if (child.gender === "FEMALE") parts.push("девочка");
  return parts.filter(Boolean).join(", ");
};

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  isOpen,
  leadName,
  children,
  groups,
  loadingGroups,
  groupsError,
  submitting,
  onClose,
  onSubmit,
}) => {
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [childId, setChildId] = useState(children.length === 1 ? children[0].id : "");
  const [groupId, setGroupId] = useState(groups.length === 1 ? groups[0].groupId : "");
  const [childBirthDate, setChildBirthDate] = useState(
    children.length === 1 ? estimateBirthDate(children[0].childAge) : ""
  );
  const [contractStartDate, setContractStartDate] = useState(today);
  const [contractEndDate, setContractEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setChildId(children.length === 1 ? children[0].id : "");
    setGroupId(groups.length === 1 ? groups[0].groupId : "");
    setChildBirthDate(children.length === 1 ? estimateBirthDate(children[0].childAge) : "");
    setContractStartDate(today);
    setContractEndDate("");
    setAmount("");
    setSubmitAttempted(false);
  }, [children, groups, isOpen, today]);

  useEffect(() => {
    if (!isOpen) return;
    if (!groupId && groups.length === 1) {
      setGroupId(groups[0].groupId);
    }
  }, [groupId, groups, isOpen]);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === childId) ?? null,
    [children, childId]
  );

  const fieldErrors = useMemo(() => {
    const childError = childId ? "" : "Выберите ребенка";
    const groupError = groupId ? "" : "Выберите группу";
    const birthDateError = childBirthDate ? "" : "Укажите дату рождения ребенка";
    const startDateError = contractStartDate ? "" : "Укажите дату начала договора";
    const endDateError =
      contractEndDate && contractStartDate && contractEndDate < contractStartDate
        ? "Дата окончания должна быть не раньше даты начала"
        : "";
    const amountNumber = amount.trim() ? Number(amount) : null;
    const amountError =
      amount.trim().length > 0 && (Number.isNaN(amountNumber) || (amountNumber ?? 0) < 0)
        ? "Сумма должна быть 0 или больше"
        : "";

    return {
      childError,
      groupError,
      birthDateError,
      startDateError,
      endDateError,
      amountError,
    };
  }, [amount, childBirthDate, childId, contractEndDate, contractStartDate, groupId]);

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
  const submitDisabled = submitting || loadingGroups || Boolean(groupsError) || hasFieldErrors;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="heading-font text-xl font-semibold text-slate-900">
            Конвертация лида в клиента
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Создание клиента, игрока и договора из лида {leadName}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-2">
          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Ребенок <span className="text-rose-500">*</span>
            </span>
            <select
              value={childId}
              onChange={(event) => {
                const nextId = event.target.value;
                setChildId(nextId);
                const child = children.find((item) => item.id === nextId);
                if (child && !childBirthDate) {
                  setChildBirthDate(estimateBirthDate(child.childAge));
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              disabled={submitting}
            >
              <option value="">Выберите ребенка</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {childDisplayLabel(child)}
                </option>
              ))}
            </select>
            {submitAttempted && fieldErrors.childError ? (
              <p className="text-xs text-rose-600">{fieldErrors.childError}</p>
            ) : null}
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Группа <span className="text-rose-500">*</span>
            </span>
            <select
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              disabled={loadingGroups || submitting}
            >
              <option value="">Выберите группу</option>
              {groups.map((group) => (
                <option key={group.groupId} value={group.groupId}>
                  {[group.name, `${group.ageFrom}-${group.ageTo} лет`, group.level]
                    .filter(Boolean)
                    .join(" · ")}
                </option>
              ))}
            </select>
            {!loadingGroups && !groupsError && groups.length === 0 ? (
              <p className="text-xs text-amber-600">No groups found for this branch</p>
            ) : null}
            {groupsError ? (
              <p className="text-xs text-rose-600">Не удалось загрузить группы</p>
            ) : null}
            {submitAttempted && fieldErrors.groupError ? (
              <p className="text-xs text-rose-600">{fieldErrors.groupError}</p>
            ) : null}
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Дата рождения <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              value={childBirthDate}
              onChange={(event) => setChildBirthDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              disabled={submitting}
            />
            {selectedChild?.childAge ? (
              <p className="text-xs text-slate-400">
                Возраст в лиде: {selectedChild.childAge} лет
              </p>
            ) : null}
            {submitAttempted && fieldErrors.birthDateError ? (
              <p className="text-xs text-rose-600">{fieldErrors.birthDateError}</p>
            ) : null}
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Дата начала договора <span className="text-rose-500">*</span>
            </span>
            <input
              type="date"
              value={contractStartDate}
              onChange={(event) => setContractStartDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              disabled={submitting}
            />
            {submitAttempted && fieldErrors.startDateError ? (
              <p className="text-xs text-rose-600">{fieldErrors.startDateError}</p>
            ) : null}
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Дата окончания
            </span>
            <input
              type="date"
              value={contractEndDate}
              onChange={(event) => setContractEndDate(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              disabled={submitting}
            />
            {submitAttempted && fieldErrors.endDateError ? (
              <p className="text-xs text-rose-600">{fieldErrors.endDateError}</p>
            ) : null}
          </label>

          <label className="space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Сумма
            </span>
            <input
              type="number"
              min={0}
              step={100}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Например, 30000"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
              disabled={submitting}
            />
            {submitAttempted && fieldErrors.amountError ? (
              <p className="text-xs text-rose-600">{fieldErrors.amountError}</p>
            ) : null}
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={buttonStyles("secondary", "md", "rounded-xl")}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={submitDisabled}
            onClick={async () => {
              setSubmitAttempted(true);
              if (submitDisabled) return;
              await onSubmit({
                childId,
                groupId,
                childBirthDate,
                contractStartDate,
                contractEndDate: contractEndDate || null,
                amount: amount.trim().length > 0 ? Number(amount) : null,
              });
            }}
            className={buttonStyles("primary", "md", "rounded-xl")}
          >
            {submitting ? "Конвертация..." : "Конвертировать в клиента"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertLeadModal;
