'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, DatabaseBackup, FileSpreadsheet, History, Home, LogOut, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { APP_VERSION_LABEL } from '@/lib/app-info';

export function AppShell({ title, role, children }: { title: string; role: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = role.toLowerCase().includes('работодатель');

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  }

  const adminNav = [
    { href: '/admin', label: 'Главная', icon: Home },
    { href: '/admin/reports', label: 'Отчеты', icon: BarChart3 },
    { href: '/admin/workers', label: 'Работники', icon: Users },
    { href: '/admin/prices', label: 'Прайс', icon: FileSpreadsheet },
    { href: '/admin/payments', label: 'Выплаты', icon: WalletCards },
    { href: '/admin/audit', label: 'Журнал', icon: History },
    { href: '/admin/security', label: 'Безопасность', icon: ShieldCheck },
    { href: '/admin/backup', label: 'Backup', icon: DatabaseBackup },
  ];

  const workerNav = [
    { href: '/worker', label: 'Мои работы', icon: Home },
  ];

  const nav = isAdmin ? adminNav : workerNav;

  return (
    <main className="min-h-screen pb-8">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--bg)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-bold text-white">ВЕК</div>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight">{title}</h1>
                <p className="text-xs text-slate-600">{role} · {APP_VERSION_LABEL}</p>
              </div>
            </div>
          </div>
          <button onClick={logout} className="btn-secondary flex shrink-0 items-center gap-2 text-sm">
            <LogOut size={16} /> Выйти
          </button>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 text-sm">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 font-semibold transition ${
                  active ? 'bg-[var(--brand)] text-white' : 'bg-white text-slate-700 hover:bg-[var(--brand-soft)]'
                }`}
              >
                <Icon size={16} /> {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className="mx-auto max-w-6xl p-4">{children}</div>

      <footer className="mx-auto max-w-6xl px-4 pt-4 text-center text-xs text-slate-400">
        Мои отчеты · {APP_VERSION_LABEL}
      </footer>
    </main>
  );
}
