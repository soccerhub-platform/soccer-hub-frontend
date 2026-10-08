import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getHomePathForRoles } from './roleRedirect';
import { PageShell, PageHeader, SectionCard } from './ui';
import { ShadcnButton as Button } from './ui/shadcn/Button';

export default function AccessDeniedPage() {
  const { user } = useAuth();
  return <main className="mx-auto max-w-xl p-6"><PageShell>
    <PageHeader title="Нет доступа к разделу" description="Ваша роль не даёт доступа к этому рабочему пространству." />
    <SectionCard><p className="mb-4 text-sm text-muted-foreground">Вернитесь в своё рабочее пространство. Если доступ нужен для работы, обратитесь к руководителю компании.</p>
      <Button asChild><Link to={getHomePathForRoles(user?.roles ?? [])}>В своё рабочее пространство</Link></Button>
    </SectionCard>
  </PageShell></main>;
}
