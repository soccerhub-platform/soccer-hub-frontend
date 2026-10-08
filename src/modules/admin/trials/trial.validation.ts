import { z } from "zod";
import { sessionTimestamp } from "../../../shared/business-time";

export const cancelSchema = z.object({ reason: z.string().trim().min(1, "Укажите причину отмены").max(1000, "Не более 1000 символов") });
export const attendanceSchema = z.object({ status: z.enum(["ATTENDED", "NO_SHOW"]), comment: z.string().trim().max(2000, "Не более 2000 символов") });

export const resultSchema = z.object({
  result: z.enum(["INTERESTED", "FOLLOW_UP", "NOT_INTERESTED", "CONVERTED"]),
  groupId: z.union([z.literal(""), z.string().uuid("Выберите группу из списка")]),
  feedback: z.string().trim().max(2000, "Не более 2000 символов"),
  nextActionType: z.enum(["CALL", "MESSAGE", "SEND_OFFER", "WAIT_FOR_DECISION", "OTHER"]),
  nextActionAt: z.string(),
}).superRefine((values, context) => {
  if (values.result !== "FOLLOW_UP") return;
  if (!values.nextActionAt) {
    context.addIssue({ code: "custom", path: ["nextActionAt"], message: "Укажите дату следующего действия" });
  } else if (!Number.isFinite(sessionTimestamp(values.nextActionAt)) || sessionTimestamp(values.nextActionAt) <= Date.now()) {
    context.addIssue({ code: "custom", path: ["nextActionAt"], message: "Выберите время в будущем (Алматы)" });
  }
});
