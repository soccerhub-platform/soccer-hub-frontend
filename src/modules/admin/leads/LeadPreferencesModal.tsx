import React, { useState } from "react";
import { Button, ErrorState, FormField, NativeSelect, Textarea, ToggleGroup, ToggleGroupItem } from "../../../shared/ui";
import { LeadApi } from "./lead.api";
import LeadModalShell from "./LeadModalShell";
import type { ExperienceLevel, LeadDetails, TimePreference } from "./types";

const days = [["MON", "Пн"], ["TUE", "Вт"], ["WED", "Ср"], ["THU", "Чт"], ["FRI", "Пт"], ["SAT", "Сб"], ["SUN", "Вс"]];

export default function LeadPreferencesModal({lead, onClose, onSaved}: {
  lead: LeadDetails; onClose: () => void; onSaved: (lead: LeadDetails) => Promise<void>;
}) {
  const [selectedDays, setSelectedDays] = useState((lead.preferredDays ?? lead.qualificationData?.preferredDays ?? "").split(";")[0].split(",").map(d => d.trim()).filter(Boolean));
  const [time, setTime] = useState<TimePreference | null>(lead.timePreference ?? lead.qualificationData?.timePreference ?? null);
  const initialExperience = lead.experience ?? lead.qualificationData?.experience ?? "";
  const [experience, setExperience] = useState<ExperienceLevel | "">(["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(initialExperience) ? initialExperience as ExperienceLevel : "");
  const [notes, setNotes] = useState(lead.notes ?? lead.qualificationData?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<LeadDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function submit() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = saved ?? await LeadApi.updatePreferences(lead.id, {version: lead.work?.version ?? 0, preferredDays: selectedDays, timePreference: time, experience, notes: notes.trim()});
      setSaved(result);
      await onSaved(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить пожелания");
    } finally { setBusy(false); }
  }
  return <LeadModalShell title="Пожелания к занятиям" description="Изменения не меняют этап лида, участников и назначенные пробные." eyebrow={lead.primaryContact.fullName} onClose={onClose} closeDisabled={busy}
    footer={<div className="flex w-full justify-end gap-2"><Button variant="secondary" disabled={busy} onClick={onClose}>Отмена</Button><Button type="submit" form="lead-preferences" disabled={busy}>{busy ? "Сохранение…" : saved ? "Обновить карточку" : "Сохранить пожелания"}</Button></div>}>
    <form id="lead-preferences" onSubmit={e => {e.preventDefault(); void submit();}} className="flex flex-col gap-5">
      {error && <div role="alert"><ErrorState title={saved ? "Пожелания сохранены, карточка не обновлена" : "Пожелания не сохранены"} message={error}/></div>}
      <fieldset disabled={busy || Boolean(saved)} className="flex min-w-0 flex-col gap-5">
        <legend className="sr-only">Предпочтения лида</legend>
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend id="preferences-days-label" className="mb-2 text-xs font-medium text-muted-foreground">Удобные дни</legend>
          <ToggleGroup type="multiple" aria-labelledby="preferences-days-label" aria-describedby="preferences-days-hint" value={selectedDays} onValueChange={setSelectedDays} variant="outline" className="flex flex-wrap justify-start gap-1">{days.map(([value,label])=><ToggleGroupItem key={value} value={value}>{label}</ToggleGroupItem>)}</ToggleGroup>
          <p id="preferences-days-hint" className="text-xs text-muted-foreground">Можно выбрать несколько. Пустой выбор — дни ещё не уточнены.</p>
        </fieldset>
        <FormField label="Удобное время"><NativeSelect aria-label="Удобное время" value={time ?? ""} onChange={e => setTime(e.target.value as TimePreference || null)}><option value="">Не уточнено</option><option value="MORNING">Утром</option><option value="AFTERNOON">Днём</option><option value="EVENING">Вечером</option></NativeSelect></FormField>
        <FormField label="Общий уровень подготовки"><NativeSelect aria-label="Общий уровень подготовки" value={experience} onChange={e=>setExperience(e.target.value as ExperienceLevel | "")}><option value="">Не уточнено</option><option value="BEGINNER">Начинающий</option><option value="INTERMEDIATE">Средний уровень</option><option value="ADVANCED">Продвинутый</option></NativeSelect></FormField>
        <FormField label="Пожелания и ограничения" hint={`${notes.length}/1000 · Например, удобный район или особенности подбора группы.`}><Textarea aria-label="Пожелания и ограничения" value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000} rows={5}/></FormField>
      </fieldset>
    </form>
  </LeadModalShell>;
}
