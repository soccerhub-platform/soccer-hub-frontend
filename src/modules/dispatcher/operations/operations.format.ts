import { sessionTimestamp } from "../../../shared/business-time";
export function dateTime(value?:string|null) {
 if(!value)return "—";
 const n=sessionTimestamp(value);return Number.isFinite(n)?new Intl.DateTimeFormat("ru-RU",{timeZone:"Asia/Almaty",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(n):"—";
}
export function businessInput(value?:string|null) {
 if(!value)return "";
 const n=sessionTimestamp(value);return Number.isFinite(n)?new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Almaty",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(n).replace(" ","T"):"";
}
export const inputInstant=(value:string)=>value?new Date(`${value}+05:00`).toISOString():null;
export const isOverdue=(value?:string|null)=>Boolean(value && sessionTimestamp(value)<Date.now());
export const OUTCOMES:Record<string,string>={REACHED:"Связались",NO_ANSWER:"Нет ответа",FOLLOW_UP:"Повторный контакт",WRONG_NUMBER:"Неверный номер",PAYMENT_PROMISED:"Обещана оплата"};
export const TRIAL_LABELS:Record<string,string>={SCHEDULED:"Запланирована",CANCELED:"Отменена",COMPLETED:"Завершена",UNMARKED:"Не отмечено",ATTENDED:"Посетил",NO_SHOW:"Не пришёл",PENDING:"Ожидает результата",INTERESTED:"Заинтересован",FOLLOW_UP:"Повторный контакт",NOT_INTERESTED:"Отказ",CONVERTED:"Заключён договор",CALL:"Позвонить",MESSAGE:"Написать",SEND_OFFER:"Отправить предложение",WAIT_FOR_DECISION:"Уточнить решение",REVIEW_RECOMMENDATION:"Обработать рекомендацию тренера",OTHER:"Другое"};
export const PRIORITIES:Record<string,string>={NORMAL:"Обычный",HIGH:"Высокий",URGENT:"Срочный"};
