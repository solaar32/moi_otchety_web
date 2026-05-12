'use client';

import { useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';

export default function AdminBackupPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function restoreBackup(file?: File) {
    if (!file) return;
    if (!confirm('Восстановить резервную копию? Текущие данные будут заменены данными из файла.')) return;
    setBusy(true);
    setMessage('');
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Не удалось восстановить резервную копию');
      setMessage('Резервная копия восстановлена. Проверьте работников, прайс и отчеты.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ошибка восстановления');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Резервные копии" role="Работодатель">
          {message && <div className="mb-4 rounded-xl bg-slate-100 p-3 text-sm font-semibold">{message}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="card p-4 space-y-3">
              <h2 className="text-lg font-bold">Скачать резервную копию</h2>
              <p className="text-sm text-slate-600">
                Файл содержит работников, администраторов, прайс, отчеты, выплаты, историю действий и версии прайса в формате JSON.
              </p>
              <a className="btn inline-flex" href="/api/backups">Скачать backup JSON</a>
            </div>
            <div className="card p-4 space-y-3">
              <h2 className="text-lg font-bold">Восстановить из backup</h2>
              <p className="text-sm text-slate-600">
                Используйте только проверенный файл, скачанный из этой системы. Перед восстановлением сделайте свежую резервную копию.
              </p>
              <input ref={inputRef} className="input" type="file" accept="application/json,.json" onChange={(e) => restoreBackup(e.target.files?.[0])} disabled={busy} />
            </div>
            <div className="card p-4 space-y-3 md:col-span-2">
              <h2 className="text-lg font-bold">Автоматический backup каждый час</h2>
              <p className="text-sm text-slate-600">
                В архиве v17 есть скрипт <code>scripts/backup-hourly.sh</code>. Его можно поставить в cron и настроить отправку в удаленное облако через rclone или другой S3/WebDAV-диск.
              </p>
              <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-white">{`crontab -e
0 * * * * /root/moi_otchety_web/scripts/backup-hourly.sh >> /var/log/moi-otchety-backup.log 2>&1`}</pre>
            </div>
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}
