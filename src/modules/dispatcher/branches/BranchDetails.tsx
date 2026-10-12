import React from "react";
import { Button, ModalShell, StatusBadge } from "../../../shared/ui";
import { DispatcherBranch, WEEK_DAYS } from "./branch.types";

import BranchHistory from "./BranchHistory";

interface Props { branch: DispatcherBranch; clubName: string; onClose: () => void; onEdit: () => void; onArchive: () => void; onRestore: () => void }

export default function BranchDetails({ branch, clubName, onClose, onEdit, onArchive, onRestore }: Props) {
  return <ModalShell title={branch.name} description={clubName} placement="right" maxWidthClassName="max-w-[560px]" onClose={onClose} footer={<div className="flex flex-wrap justify-between gap-2">{branch.active ? <><Button variant="secondary" onClick={onArchive}>В архив</Button><Button onClick={onEdit}>Редактировать</Button></> : <Button onClick={onRestore}>Восстановить филиал</Button>}</div>}>
    <div className="flex flex-col gap-6">
      <StatusBadge tone={branch.active ? "success" : "neutral"}>{branch.active ? "Активный филиал" : "В архиве"}</StatusBadge>
      <dl className="grid gap-4 text-sm">
        {[ ["Адрес", branch.address], ["Телефон", branch.phone], ["Email", branch.email], ["Руководитель", branch.managerName] ].map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 break-words font-medium">{value || "Не указан"}</dd></div>)}
      </dl>
      <section className="flex flex-col gap-3"><h3 className="ui-section-title">График работы</h3><p className="text-xs text-muted-foreground">Местное время филиала</p>{branch.workingHours?.length ? <dl className="flex flex-col gap-3">{WEEK_DAYS.map(([day, label]) => { const hours = branch.workingHours?.find(value => value.day === day); return <div key={day} className="flex justify-between gap-3 text-sm"><dt>{label}</dt><dd>{hours?.closed ? "Выходной" : hours ? `${hours.opensAt?.slice(0, 5)}–${hours.closesAt?.slice(0, 5)}` : "Не указан"}</dd></div>; })}</dl> : <p className="text-sm text-muted-foreground">График ещё не указан</p>}</section>
      <BranchHistory id={branch.branchId} />
      {!branch.active && <p className="text-sm text-muted-foreground">Филиал сохранён в архиве. Чтобы снова принимать заявки, восстановите его.{branch.archivedAt && ` Дата архива: ${new Date(branch.archivedAt).toLocaleDateString("ru-RU", { timeZone: "Asia/Almaty" })}.`}</p>}
    </div>
  </ModalShell>;
}
