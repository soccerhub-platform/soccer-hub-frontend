import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { ExclamationTriangleIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../../../shared/api";
import { useAuth } from "../../../shared/AuthContext";
import {
  Button,
  EmptyState,
  FormField,
  formControlClassName,
  LoadingState,
  ModalShell,
} from "../../../shared/ui";
import { useAdminBranch } from "../BranchContext";
import {
  GroupApi,
  type GroupApiModel,
  type GroupMembershipReason,
} from "../groups/group.api";
import type { AdminStudentMembershipHistoryItem } from "./student.types";

const ADD_REASONS: Array<{ value: GroupMembershipReason; label: string }> = [
  { value: "NEW_ENROLLMENT", label: "Новое зачисление" },
  { value: "OTHER", label: "Другое" },
];

const TRANSFER_REASONS: Array<{ value: GroupMembershipReason; label: string }> = [
  { value: "SCHEDULE_CHANGE", label: "Не подходит расписание" },
  { value: "PARENT_REQUEST", label: "Запрос родителей" },
  { value: "OTHER", label: "Другое" },
];

const REMOVE_REASONS: Array<{ value: GroupMembershipReason; label: string }> = [
  { value: "PARENT_REQUEST", label: "Запрос родителей" },
  { value: "MOVED_TO_ANOTHER_CITY", label: "Переезд" },
  { value: "MEDICAL", label: "Медицинская причина" },
  { value: "PAYMENT_ISSUES", label: "Проблемы с оплатой" },
  { value: "DISCIPLINE", label: "Дисциплина" },
  { value: "OTHER", label: "Другое" },
];

const todayIso = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};

const formatDate = (value?: string | null) => {
  if (!value) return "без даты окончания";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(date);
};

const ReasonSelect: React.FC<{
  value: GroupMembershipReason;
  onChange: (value: GroupMembershipReason) => void;
  options: Array<{ value: GroupMembershipReason; label: string }>;
}> = ({ value, onChange, options }) => (
  <select value={value} onChange={(event) => onChange(event.target.value)} className={formControlClassName}>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
);

interface Props {
  playerId: string;
  playerName: string;
  memberships: AdminStudentMembershipHistoryItem[];
  onChanged: () => void | Promise<void>;
}

const StudentMembershipDrawers: React.FC<Props> = ({ playerId, playerName, memberships, onChanged }) => {
  const { user } = useAuth();
  const token = user?.accessToken;
  const { branchId } = useAdminBranch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [groups, setGroups] = useState<GroupApiModel[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const drawer = searchParams.get("drawer");
  const membershipId = searchParams.get("membershipId");
  const addOpen = drawer === "add-to-group";
  const transferOpen = drawer === "transfer-membership" && Boolean(membershipId);
  const removeOpen = drawer === "remove-membership" && Boolean(membershipId);
  const selectedMembership = useMemo(
    () => memberships.find((item) => item.membershipId === membershipId) ?? null,
    [membershipId, memberships]
  );

  const [addForm, setAddForm] = useState({
    groupId: "",
    joinedAt: todayIso(),
    reason: "NEW_ENROLLMENT" as GroupMembershipReason,
    comment: "",
  });
  const [transferForm, setTransferForm] = useState({
    targetGroupId: "",
    transferDate: todayIso(),
    reason: "SCHEDULE_CHANGE" as GroupMembershipReason,
    comment: "",
  });
  const [removeForm, setRemoveForm] = useState({
    leftAt: todayIso(),
    reason: "PARENT_REQUEST" as GroupMembershipReason,
    comment: "",
  });

  const currentGroupIds = useMemo(
    () => new Set(memberships.filter((item) => item.status === "ACTIVE" || item.status === "UPCOMING").map((item) => item.group.id)),
    [memberships]
  );
  const addGroups = groups.filter((group) => group.status === "ACTIVE" && !currentGroupIds.has(group.groupId));
  const transferGroups = groups.filter((group) => group.status === "ACTIVE" && group.groupId !== selectedMembership?.group.id);

  useEffect(() => {
    if (!token || !branchId || (!addOpen && !transferOpen)) return;
    let active = true;
    setGroupsLoading(true);
    GroupApi.listByBranch(branchId, token)
      .then((items) => { if (active) setGroups(items); })
      .catch((error) => {
        console.error(error);
        if (active) {
          setGroups([]);
          toast.error(getApiErrorMessage(error, "Не удалось загрузить группы"));
        }
      })
      .finally(() => { if (active) setGroupsLoading(false); });
    return () => { active = false; };
  }, [addOpen, branchId, token, transferOpen]);

  useEffect(() => {
    if (addOpen && addGroups.length > 0 && !addGroups.some((group) => group.groupId === addForm.groupId)) {
      setAddForm((current) => ({ ...current, groupId: addGroups[0].groupId }));
    }
  }, [addForm.groupId, addGroups, addOpen]);

  useEffect(() => {
    if (transferOpen && transferGroups.length > 0 && !transferGroups.some((group) => group.groupId === transferForm.targetGroupId)) {
      setTransferForm((current) => ({ ...current, targetGroupId: transferGroups[0].groupId }));
    }
  }, [transferForm.targetGroupId, transferGroups, transferOpen]);

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("drawer");
    next.delete("membershipId");
    setSearchParams(next, { replace: true });
  };

  const afterMutation = async (message: string) => {
    toast.success(message);
    close();
    await onChanged();
  };

  const submitAdd = async () => {
    if (!token || !addForm.groupId || !addForm.joinedAt) return;
    setSaving(true);
    try {
      await GroupApi.addMember(addForm.groupId, {
        playerId,
        joinedAt: addForm.joinedAt,
        reason: addForm.reason,
        comment: addForm.comment.trim() || null,
      }, token);
      await afterMutation("Ученик добавлен в группу");
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Не удалось добавить ученика в группу"));
    } finally {
      setSaving(false);
    }
  };

  const submitTransfer = async () => {
    if (!token || !selectedMembership || !transferForm.targetGroupId || !transferForm.transferDate) return;
    setSaving(true);
    try {
      await GroupApi.transferMember(selectedMembership.membershipId, {
        targetGroupId: transferForm.targetGroupId,
        transferDate: transferForm.transferDate,
        reason: transferForm.reason,
        comment: transferForm.comment.trim() || null,
      }, token);
      await afterMutation("Ученик переведён в новую группу");
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Не удалось перевести ученика"));
    } finally {
      setSaving(false);
    }
  };

  const submitRemove = async () => {
    if (!token || !selectedMembership || !removeForm.leftAt) return;
    setSaving(true);
    try {
      await GroupApi.removeMember(selectedMembership.membershipId, {
        leftAt: removeForm.leftAt,
        reason: removeForm.reason,
        comment: removeForm.comment.trim() || null,
      }, token);
      await afterMutation("Участие ученика завершено");
    } catch (error) {
      console.error(error);
      toast.error(getApiErrorMessage(error, "Не удалось исключить ученика из группы"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {addOpen ? (
        <ModalShell
          title="Добавить в группу"
          description={`Создайте новое участие для ${playerName}.`}
          eyebrow="Ученик"
          placement="right"
          maxWidthClassName="max-w-lg"
          closeDisabled={saving}
          onClose={close}
          footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={close}>Отмена</Button><Button disabled={!addForm.groupId || !addForm.joinedAt} isLoading={saving} onClick={() => void submitAdd()}>Добавить</Button></div>}
        >
          {groupsLoading ? <LoadingState label="Загрузка групп..." /> : addGroups.length === 0 ? (
            <EmptyState title="Нет доступных групп" description="Ученик уже состоит во всех активных группах или в филиале нет доступных вариантов." />
          ) : (
            <div className="space-y-4">
              <FormField label="Группа"><select value={addForm.groupId} onChange={(event) => setAddForm((current) => ({ ...current, groupId: event.target.value }))} className={formControlClassName}>{addGroups.map((group) => <option key={group.groupId} value={group.groupId}>{group.name} · {group.ageFrom}-{group.ageTo} лет</option>)}</select></FormField>
              <FormField label="Дата вступления"><input type="date" value={addForm.joinedAt} onChange={(event) => setAddForm((current) => ({ ...current, joinedAt: event.target.value }))} className={formControlClassName} /></FormField>
              <FormField label="Причина"><ReasonSelect value={addForm.reason} onChange={(reason) => setAddForm((current) => ({ ...current, reason }))} options={ADD_REASONS} /></FormField>
              <FormField label="Комментарий" hint="Необязательно"><textarea rows={4} value={addForm.comment} onChange={(event) => setAddForm((current) => ({ ...current, comment: event.target.value }))} className={formControlClassName} placeholder="Контекст для истории участия" /></FormField>
            </div>
          )}
        </ModalShell>
      ) : null}

      {transferOpen ? (
        <ModalShell
          title="Перевести в другую группу"
          description={selectedMembership ? `${playerName} · из группы «${selectedMembership.group.name}»` : "Участие не найдено"}
          eyebrow="Перевод"
          placement="right"
          maxWidthClassName="max-w-lg"
          closeDisabled={saving}
          onClose={close}
          footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={close}>Отмена</Button><Button disabled={!selectedMembership || !transferForm.targetGroupId || !transferForm.transferDate} isLoading={saving} onClick={() => void submitTransfer()}>Перевести</Button></div>}
        >
          {!selectedMembership ? <EmptyState title="Участие не найдено" description="Закройте окно и обновите страницу." /> : groupsLoading ? <LoadingState label="Загрузка групп..." /> : transferGroups.length === 0 ? <EmptyState title="Нет доступной группы для перевода" /> : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-admin-700"><UserGroupIcon className="h-5 w-5" /></span><div><div className="text-xs text-slate-500">Текущая группа</div><div className="mt-0.5 text-sm font-semibold text-slate-950">{selectedMembership.group.name}</div><div className="mt-0.5 text-xs text-slate-500">с {formatDate(selectedMembership.joinedAt)}</div></div></div>
              <FormField label="Новая группа"><select value={transferForm.targetGroupId} onChange={(event) => setTransferForm((current) => ({ ...current, targetGroupId: event.target.value }))} className={formControlClassName}>{transferGroups.map((group) => <option key={group.groupId} value={group.groupId}>{group.name} · {group.ageFrom}-{group.ageTo} лет</option>)}</select></FormField>
              <FormField label="Дата перевода"><input type="date" value={transferForm.transferDate} min={selectedMembership.joinedAt} onChange={(event) => setTransferForm((current) => ({ ...current, transferDate: event.target.value }))} className={formControlClassName} /></FormField>
              <FormField label="Причина"><ReasonSelect value={transferForm.reason} onChange={(reason) => setTransferForm((current) => ({ ...current, reason }))} options={TRANSFER_REASONS} /></FormField>
              <FormField label="Комментарий" hint="Необязательно"><textarea rows={4} value={transferForm.comment} onChange={(event) => setTransferForm((current) => ({ ...current, comment: event.target.value }))} className={formControlClassName} /></FormField>
            </div>
          )}
        </ModalShell>
      ) : null}

      {removeOpen ? (
        <ModalShell
          title="Исключить из группы"
          description={selectedMembership ? `${playerName} · ${selectedMembership.group.name}` : "Участие не найдено"}
          eyebrow="Завершение участия"
          placement="right"
          maxWidthClassName="max-w-lg"
          closeDisabled={saving}
          onClose={close}
          footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={close}>Отмена</Button><Button variant="danger" disabled={!selectedMembership || !removeForm.leftAt} isLoading={saving} onClick={() => void submitRemove()}>Исключить</Button></div>}
        >
          {!selectedMembership ? <EmptyState title="Участие не найдено" description="Закройте окно и обновите страницу." /> : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" /><div><div className="text-sm font-semibold text-amber-950">История будет сохранена</div><p className="mt-1 text-xs leading-5 text-amber-800">Ученик исчезнет из активного состава после выбранной даты, но membership останется в истории.</p></div></div>
              <FormField label="Последний день в группе"><input type="date" value={removeForm.leftAt} min={selectedMembership.joinedAt} onChange={(event) => setRemoveForm((current) => ({ ...current, leftAt: event.target.value }))} className={formControlClassName} /></FormField>
              <FormField label="Причина"><ReasonSelect value={removeForm.reason} onChange={(reason) => setRemoveForm((current) => ({ ...current, reason }))} options={REMOVE_REASONS} /></FormField>
              <FormField label="Комментарий" hint="Необязательно"><textarea rows={4} value={removeForm.comment} onChange={(event) => setRemoveForm((current) => ({ ...current, comment: event.target.value }))} className={formControlClassName} /></FormField>
            </div>
          )}
        </ModalShell>
      ) : null}
    </>
  );
};

export default StudentMembershipDrawers;
