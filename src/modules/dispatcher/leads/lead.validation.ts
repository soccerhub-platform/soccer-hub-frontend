import { businessDate } from "../../../shared/business-time";
import { CreateDispatcherLeadPayload } from "./types";

export const validateDispatcherParticipant = (participant: CreateDispatcherLeadPayload["participants"][number]) => {
  if (!participant.fullName.trim()) return "Укажите имя ученика";
  if (!participant.birthDate) return "Укажите дату рождения";
  const date = new Date(`${participant.birthDate}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== participant.birthDate) return "Некорректная дата рождения";
  if (participant.birthDate >= businessDate()) return "Дата рождения должна быть в прошлом";
  return "";
};
