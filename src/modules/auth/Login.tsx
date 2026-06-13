import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRightIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useAuth } from "../../shared/AuthContext";
import { readStoredUser } from "../../shared/auth-storage";
import { canRoleAccessPath, getHomePathForRoles } from "../../shared/roleRedirect";
import BrandMark from "../../shared/ui/BrandMark";

interface LoginLocationState {
  from?: { pathname?: string };
}

const ROLE_CANDIDATES = ["ADMIN", "SUPER_ADMIN", "DISPATCHER", "COACH"] as const;

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let loggedIn = false;

      for (const role of ROLE_CANDIDATES) {
        try {
          await login(email.trim(), password, role);
          loggedIn = true;
          break;
        } catch {
          // The backend still expects role during login, so we try known workspaces.
        }
      }

      if (!loggedIn) {
        throw new Error("Invalid credentials");
      }

      const user = readStoredUser();
      const roles = user?.roles ?? [];

      if (user?.passwordChangeRequired) {
        navigate("/admin/change-password?redirect=/login", { replace: true });
        return;
      }

      const requestedPath = (location.state as LoginLocationState | null)?.from?.pathname;
      const nextPath =
        requestedPath && canRoleAccessPath(roles, requestedPath)
          ? requestedPath
          : getHomePathForRoles(roles);

      toast.success("Добро пожаловать");
      navigate(nextPath, { replace: true });
    } catch {
      setError("Не удалось войти. Проверьте email и пароль.");
      toast.error("Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eef5f1]">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1fr_460px]">
        <section className="hidden flex-col justify-between px-10 py-10 lg:flex">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-teal-100 bg-white px-3 py-2 text-sm text-teal-900 shadow-sm">
            <BrandMark compact />
            <span className="font-semibold">Club Hub</span>
          </div>

          <div className="max-w-xl">
            <div className="heading-font text-4xl font-semibold text-teal-950">
              Одна платформа для всей команды
            </div>
            <p className="mt-4 text-base leading-7 text-teal-900/75">
              Универсальное рабочее пространство для клуба: администратор, диспетчер и тренер попадут в свой интерфейс автоматически, без лишних шагов.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {[
                ["Admin", "Филиалы, группы, тренеры"],
                ["Dispatcher", "Лиды и операционный поток"],
                ["Coach", "Сегодня, посещаемость, отчеты"],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-teal-100 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-teal-950">{title}</div>
                  <div className="mt-2 text-xs leading-5 text-teal-800/70">{description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-teal-900/45">
            Club operations platform
          </div>
        </section>

        <main className="flex min-h-screen items-center justify-center px-4 py-8">
          <div className="w-full max-w-md rounded-3xl border border-teal-100 bg-white p-6 shadow-xl shadow-teal-900/10 sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className="heading-font text-2xl font-semibold text-teal-950">
                  Вход в Club Hub
                </div>
                <p className="mt-1 text-sm text-teal-900/65">
                  Введите рабочий email и пароль.
                </p>
              </div>
              <div className="shrink-0">
                <BrandMark />
              </div>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-teal-950">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                  className="mt-1 w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
                  placeholder="name@club.kz"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-teal-950">Пароль</span>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 pr-12 text-sm outline-none transition focus:border-teal-700 focus:ring-4 focus:ring-teal-100"
                    placeholder="Введите пароль"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-teal-600 hover:bg-teal-50 hover:text-teal-900"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                  </button>
                </div>
              </label>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Проверяем доступ..." : "Войти"}
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-5 rounded-2xl bg-teal-50 px-4 py-3 text-xs leading-5 text-teal-800/75">
              Роль выбирать не нужно. После входа CRM сама откроет нужное рабочее пространство.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
