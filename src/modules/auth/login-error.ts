import { ApiError } from "../../shared/api";

export function loginErrorMessage(error: unknown): string {
  if (error instanceof TypeError) return "Нет соединения с сервером. Проверьте подключение и попробуйте ещё раз.";
  if (error instanceof ApiError) {
    if (error.status >= 500) return "Сервис входа временно недоступен. Попробуйте ещё раз позже.";
    if (error.status === 429) return "Слишком много попыток входа. Подождите и попробуйте ещё раз.";
    if (error.status === 401 || error.status === 400) return "Не удалось войти. Проверьте email и пароль.";
    if (error.status === 403) return "Доступ к учётной записи ограничен. Обратитесь к руководителю или администратору.";
  }
  return "Не удалось завершить вход. Попробуйте ещё раз.";
}
