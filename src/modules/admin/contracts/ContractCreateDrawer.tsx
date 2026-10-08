import React, { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CheckCircle, FileText } from "lucide-react";
import { getApiErrorMessage } from "../../../shared/api";
import { businessDate } from "../../../shared/business-time";
import {
  Alert,
  AlertDescription,
  Button,
  DatePicker,
  EntitySheet,
  Input,
  SearchableSelect,
  Textarea,
} from "../../../shared/ui";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../shared/ui/shadcn/form";
import { ClientApi } from "../clients/client.api";
import type { ClientListItem } from "../clients/client.types";
import { ContractsApi } from "./contracts.api";
import type { ContractParticipantOption } from "./contracts.types";

const today = businessDate;
const monthLater = () => {
  const date = new Date(`${businessDate()}T12:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.toISOString().slice(0, 10);
};

const contractSchema = z.object({
  clientId: z.string().min(1, "Выберите клиента"),
  playerId: z.string().min(1, "Выберите связанного ученика"),
  startDate: z.string().min(1, "Укажите дату начала"),
  endDate: z.string(),
  amount: z.string().refine((value) => value !== "" && Number(value) >= 0, "Укажите корректную стоимость"),
  notes: z.string(),
}).refine((values) => !values.endDate || values.endDate >= values.startDate, {
  path: ["endDate"],
  message: "Дата окончания не может быть раньше даты начала",
});

type ContractFormValues = z.infer<typeof contractSchema>;

const ContractCreateDrawer: React.FC<{
  branchId: string;
  initialClientId?: string;
  initialPlayerId?: string;
  sourceLeadId?: string;
  onClose: () => void;
  onCreated: (contractId: string) => void;
}> = ({ branchId, initialClientId, initialPlayerId, sourceLeadId, onClose, onCreated }) => {
  const [clients, setClients] = useState<Pick<ClientListItem, "id" | "fullName" | "phone" | "email">[]>([]);
  const [students, setStudents] = useState<ContractParticipantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState<"draft" | "activate" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdDraftId, setCreatedDraftId] = useState<string | null>(null);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      clientId: initialClientId ?? "",
      playerId: initialPlayerId ?? "",
      startDate: today(),
      endDate: monthLater(),
      amount: "30000",
      notes: "",
    },
  });

  const clientId = form.watch("clientId");
  const playerId = form.watch("playerId");
  const startDate = form.watch("startDate");
  const client = useMemo(() => clients.find((item) => item.id === clientId), [clientId, clients]);
  const student = useMemo(() => students.find((item) => item.id === playerId), [playerId, students]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = initialClientId
      ? ClientApi.get(initialClientId).then(detail => [detail.client])
      : ClientApi.list({ branchId, page: 0, size: 100, sort: "fullName,asc" }).then(response => response.content);
    void load.then(items => { if (active) setClients(items); })
      .catch((reason) => { if (active) setError(getApiErrorMessage(reason, "Не удалось загрузить клиентов")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branchId, initialClientId]);

  useEffect(() => {
    if (!clientId) {
      setStudents([]);
      form.setValue("playerId", "");
      return;
    }

    setStudentsLoading(true);
    form.setValue("playerId", initialPlayerId ?? "");
    ContractsApi.listParticipants(branchId, clientId)
      .then((items) => {
        setStudents(items);
        if (initialPlayerId && items.some((item) => item.id === initialPlayerId)) {
          form.setValue("playerId", initialPlayerId, { shouldValidate: true });
        } else if (items.length === 1) {
          form.setValue("playerId", items[0].id, { shouldValidate: true });
        }
      })
      .catch((reason) => setError(getApiErrorMessage(reason, "Не удалось загрузить учеников клиента")))
      .finally(() => setStudentsLoading(false));
  }, [branchId, clientId, form, initialPlayerId]);

  const submit = async (values: ContractFormValues, activate: boolean) => {
    if (saving) return;
    setSaving(activate ? "activate" : "draft");
    setError(null);
    try {
      let contractId = createdDraftId;
      if (!contractId) {
      const created = await ContractsApi.create({
        branchId,
        clientId: values.clientId,
        playerId: values.playerId,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
        amount: Number(values.amount),
        currency: "KZT",
        notes: values.notes.trim() || undefined,
        sourceLeadId,
      });
      contractId = created.id;
      setCreatedDraftId(contractId);
      }
      if (activate) await ContractsApi.activate(contractId);
      onCreated(contractId);
    } catch (reason) {
      setError(getApiErrorMessage(reason, "Не удалось создать договор"));
    } finally {
      setSaving(null);
    }
  };

  const handleSubmit = (activate: boolean) => form.handleSubmit((values) => submit(values, activate))();

  return (
    <EntitySheet
      title="Новый договор"
      description="Свяжите существующего клиента с учеником. Зачисление в группу выполняется отдельно."
      contentClassName="sm:max-w-xl"
      closeDisabled={saving !== null}
      onClose={onClose}
      footer={(
        <div className="flex w-full flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={saving !== null} onClick={onClose}>Отмена</Button>
          <Button
            type="button"
            variant="secondary"
            isLoading={saving === "draft"}
            disabled={saving !== null}
            onClick={() => void handleSubmit(false)}
          >
            <FileText className="h-4 w-4" /> {createdDraftId ? "Открыть черновик" : "Сохранить черновик"}
          </Button>
          <Button
            type="button"
            isLoading={saving === "activate"}
            disabled={saving !== null}
            onClick={() => void handleSubmit(true)}
          >
            <CheckCircle className="h-4 w-4" /> {createdDraftId ? "Повторить активацию" : "Создать и активировать"}
          </Button>
        </div>
      )}
    >
      <Form {...form}>
        {createdDraftId && <p role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Черновик уже создан. Повторная активация использует этот же договор. Для редактирования откройте черновик.</p>}
        <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
          <fieldset disabled={saving !== null || Boolean(createdDraftId)} className="flex min-w-0 flex-col gap-5">
          <section className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-black/8 bg-[#f5f5f7] p-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-admin-600">Клиент</div>
              <div className="mt-1 font-semibold text-slate-950">{client?.fullName || "Не выбран"}</div>
              <div className="mt-1 text-xs text-slate-600">заключает и оплачивает</div>
            </div>
            <span className="text-slate-300" aria-hidden="true">→</span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-admin-600">Ученик</div>
              <div className="mt-1 font-semibold text-slate-950">{student?.fullName || "Не выбран"}</div>
              <div className="mt-1 text-xs text-slate-600">получает услугу</div>
            </div>
          </section>

          <FormField control={form.control} name="clientId" render={({ field }) => (
            <FormItem>
              <FormLabel>Клиент *</FormLabel>
              <FormControl>
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  loading={loading}
                  disabled={Boolean(initialClientId)}
                  placeholder="Выберите клиента"
                  searchPlaceholder="Поиск по имени, телефону или email..."
                  emptyText="Клиенты не найдены"
                  options={clients.map((item) => ({
                    value: item.id,
                    label: item.fullName,
                    description: item.phone || item.email || "Контакты не указаны",
                    keywords: `${item.phone ?? ""} ${item.email ?? ""}`,
                  }))}
                />
              </FormControl>
              <FormDescription>Клиент будет стороной договора и плательщиком.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="playerId" render={({ field }) => (
            <FormItem>
              <FormLabel>Связанный ученик *</FormLabel>
              <FormControl>
                <SearchableSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  loading={studentsLoading}
                  disabled={!clientId}
                  placeholder={clientId ? "Выберите ученика" : "Сначала выберите клиента"}
                  searchPlaceholder="Поиск ученика..."
                  emptyText="Связанные ученики не найдены"
                  options={students.map((item) => ({ value: item.id, label: item.fullName }))}
                />
              </FormControl>
              <FormDescription>Услугу по договору будет получать выбранный ученик.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          {clientId && !studentsLoading && !students.length ? (
            <Alert>
              <AlertDescription>Сначала свяжите ученика с клиентом в карточке клиента.</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Начало *</FormLabel>
                <FormControl><DatePicker value={field.value} onValueChange={field.onChange} aria-invalid={Boolean(form.formState.errors.startDate)} /></FormControl>
                <FormDescription>Первый день действия договора.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="endDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Окончание</FormLabel>
                <FormControl><DatePicker value={field.value} onValueChange={field.onChange} min={startDate} clearable placeholder="Без даты окончания" aria-invalid={Boolean(form.formState.errors.endDate)} /></FormControl>
                <FormDescription>Оставьте пустым для бессрочного договора.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="amount" render={({ field }) => (
            <FormItem>
              <FormLabel>Стоимость, KZT *</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  placeholder="Например, 30000"
                  className="tabular-nums"
                  {...field}
                  onChange={(event) => field.onChange(event.target.value.replace(/\D/g, ""))}
                />
              </FormControl>
              <FormDescription>Полная стоимость договора в тенге.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="notes" render={({ field }) => (
            <FormItem>
              <FormLabel>Комментарий</FormLabel>
              <FormControl><Textarea className="min-h-24 resize-y" placeholder="Условия, скидка или важное примечание" {...field} /></FormControl>
              <FormDescription>Внутренняя заметка для администраторов.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />

          </fieldset>
          {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        </form>
      </Form>
    </EntitySheet>
  );
};

export default ContractCreateDrawer;
