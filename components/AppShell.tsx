'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  DatabaseBackup,
  FileSpreadsheet,
  History,
  Home,
  LogOut,
  PlusCircle,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { APP_VERSION_LABEL } from '@/lib/app-info';

export function AppShell({
  title,
  role,
  children,
}: {
  title: string;
  role: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = role.toLowerCase().includes('работодатель');

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  }

  const adminNav = [
    { href: '/admin', label: 'Главная', icon: Home },
    { href: '/admin/reports', label: 'Отчёты', icon: BarChart3 },
    { href: '/admin/workers', label: 'Работники', icon: Users },
    { href: '/admin/prices', label: 'Прайс', icon: FileSpreadsheet },
    { href: '/admin/payments', label: 'Выплаты', icon: WalletCards },
    { href: '/admin/audit', label: 'Журнал', icon: History },
    { href: '/admin/security', label: 'Безопасность', icon: ShieldCheck },
    { href: '/admin/backup', label: 'Backup', icon: DatabaseBackup },
  ];

  const workerNav = [
    { href: '/worker', label: 'Главная', icon: Home },
    { href: '/worker', label: 'Добавить', icon: PlusCircle },
    { href: '/worker', label: 'История', icon: BarChart3 },
  ];

  const nav = isAdmin ? adminNav : workerNav;

  return (
    <main className="min-h-screen bg-slate-100 pb-20 md:pb-8">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-sm font-black text-white shadow-sm">
              ВЕК
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-black leading-tight text-slate-900">
                {title}
              </h1>
              <p className="truncate text-xs text-slate-500">
                {role} · {APP_VERSION_LABEL}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>

        <nav className="hidden border-t border-slate-100 md:block">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 text-sm">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2 font-bold transition ${
                    active
                      ? 'bg-[var(--brand)] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-7xl p-4">{children}</div>

      <footer className="mx-auto hidden max-w-7xl px-4 pt-4 text-center text-xs text-slate-400 md:block">
        Мои отчёты · {APP_VERSION_LABEL}
      </footer>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white md:hidden">
        <div className="grid grid-cols-4">
          {nav.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={`mobile-${item.href}-${item.label}`}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-bold ${
                  active ? 'text-[var(--brand)]' : 'text-slate-500'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={logout}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-[11px] font-bold text-slate-500"
          >
            <LogOut size={20} />
            <span>Выйти</span>
          </button>
        </div>
      </nav>
    </main>
  );
}