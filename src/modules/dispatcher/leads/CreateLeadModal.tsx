import React, { useMemo, useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { DispatcherLeadsApi } from "./leads.api";
import {
  CreateDispatcherLeadPayload,
  DispatcherBranchOption,
  DispatcherLeadChild,
} from "./types";
import { buttonStyles } from "../../../shared/ui/buttonStyles";

interface CreateLeadModalProps {
  token: string;
  branches: DispatcherBranchOption[];
  initialBranchId?: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

const EMPTY_CHILD: DispatcherLeadChild = {
  childName: "",
  childAge: 0,
};

const isValidPhone = (value: string) => /^[+0-9()\s-]{7,}$/.test(value.trim());
const isValidEmail = (value: string) =>
  value.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const inputBaseClassName =
  "w-full rounded-xl border bg-white px-3 py-2.5 outline-none transition focus:ring-4";

const CreateLeadModal: React.FC<CreateLeadModalProps> = ({
  token,
  branches,
  initialBranchId,
  onClose,
  onSuccess,
}) => {
  const [parentName, setParentName] = useState("");
  const [phone, setPhone] = useState("");
  const [branchId, setBranchId] = useState(initialBranchId ?? branches[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [children, setChildren] = useState<DispatcherLeadChild[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validation = useMemo(() => {
    const fieldErrors = {
      parentName: "",
      phone: "",
      branchId: "",
      email: "",
    };

    if (!parentName.trim()) {
      fieldErrors.parentName = "Укажите имя родителя";
    }

    if (!phone.trim()) {
      fieldErrors.phone = "Укажите телефон";
    } else if (!isValidPhone(phone)) {
      fieldErrors.phone = "Некорректный формат телефона";
    }

    if (!branchId.trim()) {
      fieldErrors.branchId = "Выберите филиал";
    }

    if (!isValidEmail(email)) {
      fieldErrors.email = "Некорректный email";
    }

    const childErrors = children.map((child) => {
      const hasName = child.childName.trim().length > 0;
      const hasAge = child.childAge > 0;

      if (!hasName && !hasAge) return "";
      if (!hasName) return "Укажите имя ребенка";
      if (!hasAge) return "Укажите корректный возраст";
      return "";
    });

    const isValid =
      Object.values(fieldErrors).every((value) => !value) &&
      childErrors.every((value) => !value);

    return { fieldErrors, childErrors, isValid };
  }, [branchId, children, email, parentName, phone]);

  const updateChild = (index: number, nextChild: DispatcherLeadChild) => {
    setChildren((prev) =>
      prev.map((child, childIndex) => {
        if (childIndex !== index) return child;
        return nextChild;
      })
    );
  };

  const handleSubmit = async () => {
    if (!validation.isValid) return;

    const payload: CreateDispatcherLeadPayload = {
      parentName: parentName.trim(),
      phone: phone.trim(),
      branchId,
      email: email.trim() || undefined,
      comment: comment.trim() || undefined,
      children: children
        .filter((child) => child.childName.trim() || child.childAge)
        .map((child) => ({
          childName: child.childName.trim(),
          childAge: child.childAge,
        })),
    };

    setLoading(true);
    setError(null);

    try {
      await DispatcherLeadsApi.create(payload, token);
      await onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Не удалось создать лид");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="heading-font text-xl font-semibold text-slate-900">
              Новый лид
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Диспетчер создает входящий лид без назначения и изменения статуса.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={buttonStyles("ghost", "sm", "rounded-full p-2 text-slate-400")}
          >
            ✕
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Имя родителя
                <span className="ml-1 text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={parentName}
                onChange={(event) => setParentName(event.target.value)}
                className={`${inputBaseClassName} ${
                  validation.fieldErrors.parentName
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                }`}
              />
              {validation.fieldErrors.parentName ? (
                <p className="text-xs text-rose-600">{validation.fieldErrors.parentName}</p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Телефон
                <span className="ml-1 text-rose-500">*</span>
              </span>
              <input
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+7 777 123 45 67"
                className={`${inputBaseClassName} ${
                  validation.fieldErrors.phone
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                }`}
              />
              {validation.fieldErrors.phone ? (
                <p className="text-xs text-rose-600">{validation.fieldErrors.phone}</p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Филиал
                <span className="ml-1 text-rose-500">*</span>
              </span>
              <select
                value={branchId}
                onChange={(event) => setBranchId(event.target.value)}
                className={`${inputBaseClassName} ${
                  validation.fieldErrors.branchId
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                }`}
              >
                <option value="">Выберите филиал</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
              {validation.fieldErrors.branchId ? (
                <p className="text-xs text-rose-600">{validation.fieldErrors.branchId}</p>
              ) : null}
            </label>

            <label className="space-y-1 text-sm text-slate-600">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`${inputBaseClassName} ${
                  validation.fieldErrors.email
                    ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                    : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                }`}
              />
              {validation.fieldErrors.email ? (
                <p className="text-xs text-rose-600">{validation.fieldErrors.email}</p>
              ) : null}
            </label>
          </div>

          <label className="mt-4 block space-y-1 text-sm text-slate-600">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Комментарий
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none transition focus:border-cyan-700 focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          <section className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                Дети
              </h4>
              <button
                type="button"
                onClick={() => setChildren((prev) => [...prev, EMPTY_CHILD])}
                className={buttonStyles("soft", "sm", "rounded-full")}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Добавить ребенка
              </button>
            </div>

            {children.length > 0 ? (
              <div className="space-y-3">
                {children.map((child, index) => (
                  <div
                    key={`child-${index}`}
                    className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_120px_44px]"
                  >
                    <label className="space-y-1 text-sm text-slate-600">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Имя ребенка
                      </span>
                      <input
                        type="text"
                        value={child.childName}
                        onChange={(event) =>
                          updateChild(index, {
                            ...child,
                            childName: event.target.value,
                          })
                        }
                        className={`${inputBaseClassName} ${
                          validation.childErrors[index]
                            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                            : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                        }`}
                      />
                    </label>

                    <label className="space-y-1 text-sm text-slate-600">
                      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Возраст
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={child.childAge || ""}
                        onChange={(event) =>
                          updateChild(index, {
                            ...child,
                            childAge: Number(event.target.value),
                          })
                        }
                        className={`${inputBaseClassName} ${
                          validation.childErrors[index]
                            ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                            : "border-slate-200 focus:border-cyan-700 focus:ring-cyan-100"
                        }`}
                      />
                    </label>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() =>
                          setChildren((prev) => prev.filter((_, childIndex) => childIndex !== index))
                        }
                        className={buttonStyles("softDanger", "md", "h-[46px] w-full rounded-xl px-0 text-slate-500 hover:text-rose-600")}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    {validation.childErrors[index] ? (
                      <p className="text-xs text-rose-600 md:col-span-3">
                        {validation.childErrors[index]}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-400">
                Дети не добавлены
              </div>
            )}
          </section>

          {error ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className={buttonStyles("secondary", "md", "rounded-xl")}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!validation.isValid || loading}
            className={buttonStyles("primary", "md", "rounded-xl")}
          >
            {loading ? "Создание..." : "Создать лид"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateLeadModal;
