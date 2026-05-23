import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BellIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  IdentificationIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { getApiErrorMessage } from "../api";
import { useAuth } from "../AuthContext";
import {
  ChangePasswordForm,
  UserNotificationSettings,
  validatePasswordForm,
} from "./foundation";
import {
  Button,
  FormField,
  LoadingState,
  PageShell,
  SectionCard,
  formControlClassName,
} from "../ui";
import { ProfileScope, RoleProfileApi, RoleProfileResponse } from "./profile.api";

type ProfileTheme = {
  text: string;
  border: string;
  softBg: string;
  button: string;
  ring: string;
};

type UserProfilePageProps = {
  scope: ProfileScope;
  roleLabel: string;
  roleDescription: string;
  workspaceTitle: string;
  helpText: string;
  theme: ProfileTheme;
};

const SectionError: React.FC<{ message: string }> = ({ message }) => {
  if (!message) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {message}
    </div>
  );
};

const UserProfilePage: React.FC<UserProfilePageProps> = ({
  scope,
  roleLabel,
  roleDescription,
  workspaceTitle,
  helpText,
  theme,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileRaw, setProfileRaw] = useState<RoleProfileResponse | null>(null);
  const [sectionErrors, setSectionErrors] = useState({
    profile: "",
    notifications: "",
    password: "",
  });

  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    specialization: "",
  });

  const [notifications, setNotifications] = useState<UserNotificationSettings>({
    todaySessions: true,
    overdueReports: true,
    scheduleChanges: true,
  });

  const [passwordForm, setPasswordForm] = useState<ChangePasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [profileData, notificationData] = await Promise.all([
          RoleProfileApi.getProfile(scope),
          RoleProfileApi.getNotificationSettings(scope),
        ]);
        if (!isMounted) return;
        setProfileRaw(profileData);
        setProfile({
          firstName: profileData.firstName ?? "",
          lastName: profileData.lastName ?? "",
          phone: profileData.phone ?? "",
          email: profileData.email ?? user?.email ?? "",
          specialization: profileData.specialization ?? "",
        });
        setNotifications(notificationData);
      } catch (err) {
        if (!isMounted) return;
        console.error(err);
        setError(getApiErrorMessage(err, "Не удалось загрузить профиль"));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [scope, user?.email]);

  const initials = useMemo(() => {
    return [profile.firstName, profile.lastName]
      .map((part) => part.trim()[0])
      .filter(Boolean)
      .join("")
      .toUpperCase();
  }, [profile.firstName, profile.lastName]);

  const workspaceItems = useMemo(() => {
    if (!profileRaw) return [];
    const branches = (profileRaw.branches ?? []).map((branch) => ({
      title: branch.branchName,
      description: `Филиал ID: ${branch.branchId}`,
    }));
    const rights =
      scope === "admin"
        ? (profileRaw as { permissions?: string[] }).permissions ?? []
        : (profileRaw as { responsibilities?: string[] }).responsibilities ?? [];

    if (rights.length > 0) {
      branches.push({
        title: scope === "admin" ? "Ключевые доступы" : "Зоны ответственности",
        description: rights.join(", "),
      });
    }
    return branches;
  }, [profileRaw, scope]);

  const saveProfile = async () => {
    setSectionErrors((prev) => ({ ...prev, profile: "" }));
    if (!profile.firstName.trim() || !profile.lastName.trim()) {
      setSectionErrors((prev) => ({ ...prev, profile: "Укажите имя и фамилию" }));
      return;
    }
    if (!profile.phone.trim()) {
      setSectionErrors((prev) => ({ ...prev, profile: "Укажите телефон" }));
      return;
    }
    if (!profile.email.trim()) {
      setSectionErrors((prev) => ({ ...prev, profile: "Укажите email" }));
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await RoleProfileApi.updateProfile(scope, {
        firstName: profile.firstName.trim(),
        lastName: profile.lastName.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        specialization: profile.specialization.trim() || undefined,
      });
      setProfileRaw(updated);
      setProfile({
        firstName: updated.firstName ?? "",
        lastName: updated.lastName ?? "",
        phone: updated.phone ?? "",
        email: updated.email ?? "",
        specialization: updated.specialization ?? "",
      });
      toast.success("Профиль сохранен");
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        profile: getApiErrorMessage(err, "Не удалось сохранить профиль"),
      }));
    } finally {
      setSavingProfile(false);
    }
  };

  const saveNotifications = async () => {
    setSectionErrors((prev) => ({ ...prev, notifications: "" }));
    setSavingNotifications(true);
    try {
      const data = await RoleProfileApi.updateNotificationSettings(scope, notifications);
      setNotifications(data);
      toast.success("Уведомления сохранены");
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        notifications: getApiErrorMessage(err, "Не удалось сохранить уведомления"),
      }));
    } finally {
      setSavingNotifications(false);
    }
  };

  const changePassword = async () => {
    setSectionErrors((prev) => ({ ...prev, password: "" }));
    const passwordError = validatePasswordForm(passwordForm);
    if (passwordError) {
      setSectionErrors((prev) => ({ ...prev, password: passwordError }));
      return;
    }
    setSavingPassword(true);
    try {
      await RoleProfileApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success("Пароль обновлен");
    } catch (err) {
      setSectionErrors((prev) => ({
        ...prev,
        password: getApiErrorMessage(err, "Не удалось обновить пароль"),
      }));
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <LoadingState label="Загрузка профиля..." />
      </PageShell>
    );
  }

  if (error || !profileRaw) {
    return (
      <PageShell>
        <SectionError message={error || "Не удалось загрузить профиль"} />
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-6xl space-y-5">
      <section className={`rounded-3xl border ${theme.border} bg-white p-5 shadow-sm`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white ${theme.button}`}>
              {initials || <UserCircleIcon className="h-8 w-8" />}
            </div>
            <div className="min-w-0">
              <h1 className={`heading-font text-2xl font-semibold ${theme.text}`}>
                {profile.firstName} {profile.lastName}
              </h1>
              <div className="mt-1 truncate text-sm text-slate-500">{profile.email}</div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                {profileRaw.status === "ACTIVE" ? "Активный пользователь" : profileRaw.status}
              </div>
            </div>
          </div>
          <div className={`rounded-2xl ${theme.softBg} px-4 py-3`}>
            <div className={`text-sm font-semibold ${theme.text}`}>{roleLabel}</div>
            <div className="mt-1 max-w-md text-xs leading-5 text-slate-600">{roleDescription}</div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <SectionCard
            title="Основные данные"
            icon={<IdentificationIcon className={`h-5 w-5 ${theme.text}`} />}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Имя">
                <input
                  value={profile.firstName}
                  onChange={(event) => setProfile({ ...profile, firstName: event.target.value })}
                  className={formControlClassName}
                />
              </FormField>
              <FormField label="Фамилия">
                <input
                  value={profile.lastName}
                  onChange={(event) => setProfile({ ...profile, lastName: event.target.value })}
                  className={formControlClassName}
                />
              </FormField>
              <FormField label="Телефон">
                <input
                  value={profile.phone}
                  onChange={(event) => setProfile({ ...profile, phone: event.target.value })}
                  className={formControlClassName}
                />
              </FormField>
              <FormField label="Email">
                <input
                  value={profile.email}
                  onChange={(event) => setProfile({ ...profile, email: event.target.value })}
                  className={formControlClassName}
                />
              </FormField>
            </div>
            <FormField label="Специализация" className="mt-3">
              <input
                value={profile.specialization}
                onChange={(event) => setProfile({ ...profile, specialization: event.target.value })}
                className={formControlClassName}
              />
            </FormField>
            <div className="mt-3">
              <SectionError message={sectionErrors.profile} />
            </div>
            <Button
              type="button"
              isLoading={savingProfile}
              onClick={saveProfile}
              className={`mt-4 h-11 w-full ${theme.button}`}
            >
              Сохранить профиль
            </Button>
          </SectionCard>

          <SectionCard
            title="Уведомления"
            icon={<BellIcon className={`h-5 w-5 ${theme.text}`} />}
          >
            {[
              ["todaySessions", "Напоминать о тренировках на сегодня"],
              ["overdueReports", "Показывать напоминания о незакрытых отчетах"],
              ["scheduleChanges", "Сообщать об изменениях расписания"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0">
                <span className="text-sm text-slate-800">{label}</span>
                <input
                  type="checkbox"
                  checked={notifications[key as keyof UserNotificationSettings]}
                  onChange={(event) =>
                    setNotifications({
                      ...notifications,
                      [key]: event.target.checked,
                    })
                  }
                  className={`h-5 w-5 rounded border-slate-300 ${theme.ring}`}
                />
              </label>
            ))}
            <SectionError message={sectionErrors.notifications} />
            <Button
              type="button"
              isLoading={savingNotifications}
              onClick={saveNotifications}
              className={`mt-3 h-11 w-full ${theme.button}`}
            >
              Сохранить уведомления
            </Button>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard
            title={workspaceTitle}
            icon={<BuildingOffice2Icon className={`h-5 w-5 ${theme.text}`} />}
          >
            <div className="space-y-2">
              {workspaceItems.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  Данные рабочей зоны пока не получены.
                </div>
              ) : (
                workspaceItems.map((item) => (
                  <div key={item.title} className="rounded-xl bg-slate-50 px-3 py-3">
                    <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Безопасность"
            icon={<LockClosedIcon className={`h-5 w-5 ${theme.text}`} />}
          >
            <div className="space-y-3">
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                placeholder="Текущий пароль"
                className={formControlClassName}
              />
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                placeholder="Новый пароль"
                className={formControlClassName}
              />
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                placeholder="Повторите новый пароль"
                className={formControlClassName}
              />
            </div>
            <div className="mt-3">
              <SectionError message={sectionErrors.password} />
            </div>
            <Button
              type="button"
              isLoading={savingPassword}
              onClick={changePassword}
              className={`mt-4 h-11 w-full ${theme.button}`}
            >
              Обновить пароль
            </Button>
          </SectionCard>

          <section className={`rounded-2xl border ${theme.border} ${theme.softBg} p-4`}>
            <div className="flex items-start gap-3">
              <ShieldCheckIcon className={`mt-0.5 h-5 w-5 shrink-0 ${theme.text}`} />
              <div>
                <div className={`text-sm font-semibold ${theme.text}`}>Доступ и права</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">{helpText}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
};

export default UserProfilePage;

