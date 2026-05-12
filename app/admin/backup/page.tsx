'use client';

import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';

export default function AdminBackupPage() {
  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Резервные копии" role="Работодатель">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-4 space-y-3">
              <h2 className="text-lg font-bold">Скачать резервную копию</h2>
              <p className="text-sm text-slate-600">
                Файл содержит работников, прайс, отчеты, выплаты, историю действий и версии прайса в формате JSON.
              </p>
              <a className="btn inline-flex" href="/api/backups">Скачать backup JSON</a>
            </div>
            <div className="card p-4 space-y-3">
              <h2 className="text-lg font-bold">Рекомендация</h2>
              <p className="text-sm text-slate-600">
                Скачивайте резервную копию минимум раз в неделю и перед загрузкой нового прайса. Полное серверное восстановление позже можно автоматизировать через PostgreSQL backup.
              </p>
            </div>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}
