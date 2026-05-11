'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function AppShell({ title, role, children }: { title: string; role: string; children: React.ReactNode }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <main className="min-h-screen pb-8">
      <header className="sticky top-0 z-10 bg-[var(--bg)]/90 backdrop-blur border-b border-[var(--line)]">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-xs text-slate-600">{role}</p>
          </div>
          <button onClick={logout} className="btn-secondary flex items-center gap-2 text-sm">
            <LogOut size={16} /> Выйти
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl p-4">{children}</div>
    </main>
  );
}
