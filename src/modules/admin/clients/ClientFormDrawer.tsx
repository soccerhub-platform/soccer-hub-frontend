import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  EntitySheet,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import { clientSourceLabels, type ClientDetails, type ClientFormInput, type ClientSource } from "./client.types";

const clientSourceValues = Object.keys(clientSourceLabels) as [ClientSource, ...ClientSource[]];

const clientFormSchema = z.object({
  firstName: z.string().trim().min(1, "Укажите имя"),
  lastName: z.string(),
  phone: z.string(),
  email: z.string().refine((value) => !value || z.email().safeParse(value).success, "Некорректный email"),
  source: z.enum(clientSourceValues),
  sourceDetails: z.string(),
  comments: z.string(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

const emptyForm: ClientFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  source: "MANUAL",
  sourceDetails: "",
  comments: "",
};

const ClientFormDrawer: React.FC<{
  client?: ClientDetails | null;
  saving: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (input: ClientFormInput) => void;
}> = ({ client, saving, error, onClose, onSubmit }) => {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    form.reset(client ? {
      firstName: client.client.firstName ?? "",
      lastName: client.client.lastName ?? "",
      phone: client.client.phone ?? "",
      email: client.client.email ?? "",
      source: client.client.source ?? "UNKNOWN",
      sourceDetails: client.client.sourceDetails ?? "",
      comments: client.client.comments ?? "",
    } : emptyForm);
  }, [client, form]);

  const source = form.watch("source");

  return (
    <EntitySheet
      title={client ? "Редактировать клиента" : "Новый клиент"}
      description="Контакт и сторона будущих договоров"
      onClose={onClose}
      closeDisabled={saving}
      footer={(
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Отмена</Button>
          <Button type="submit" form="client-form" isLoading={saving}>Сохранить</Button>
        </div>
      )}
    >
      <Form {...form}>
        <form id="client-form" className="space-y-4" onSubmit={form.handleSubmit((values) => onSubmit(values))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>Имя *</FormLabel>
                <FormControl><Input autoFocus placeholder="Например, Мария" {...field} /></FormControl>
                <FormDescription>Как обращаться к клиенту.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>Фамилия</FormLabel>
                <FormControl><Input placeholder="Например, Иванова" {...field} /></FormControl>
                <FormDescription>Можно заполнить позже.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Телефон</FormLabel>
              <FormControl><Input type="tel" placeholder="+7 700 000 00 00" {...field} /></FormControl>
              <FormDescription>Основной номер для связи и уведомлений.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" placeholder="client@example.com" {...field} /></FormControl>
              <FormDescription>Необязательно. Используется для документов и связи.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="source" render={({ field }) => (
            <FormItem>
              <FormLabel>Источник</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue placeholder="Выберите источник" /></SelectTrigger></FormControl>
                <SelectContent>
                  {Object.entries(clientSourceLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormDescription>Откуда клиент узнал о клубе — для аналитики привлечения.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          {source === "OTHER" ? (
            <FormField control={form.control} name="sourceDetails" render={({ field }) => (
              <FormItem>
                <FormLabel>Уточнение источника</FormLabel>
                <FormControl><Input placeholder="Например, турнир в школе" {...field} /></FormControl>
                <FormDescription>Коротко укажите конкретный источник.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          ) : null}
          <FormField control={form.control} name="comments" render={({ field }) => (
            <FormItem>
              <FormLabel>Комментарий</FormLabel>
              <FormControl><Textarea className="min-h-28 resize-y" placeholder="Предпочтения, договорённости или важный контекст" {...field} /></FormControl>
              <FormDescription>Внутренняя заметка, доступная сотрудникам клуба.</FormDescription>
              <FormMessage />
            </FormItem>
          )} />
          {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}
        </form>
      </Form>
    </EntitySheet>
  );
};

export default ClientFormDrawer;
