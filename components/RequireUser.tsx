'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role, User } from '@/lib/types';

export function RequireUser({ role, children }: { role: Role; children: (user: User) => React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      const res = await fetch('/api/me', { cache: 'no-store' });
      if (!alive) return;
      if (!res.ok) {
        router.push('/');
        return;
      }
      const json = await res.json();
      const current = json.user as User;
      if (current.role !== role) {
        router.push(current.role === 'admin' ? '/admin' : '/worker');
        return;
      }
      setUser(current);
      setLoading(false);
    }

    load();
    return () => {
      alive = false;
    };
  }, [router, role]);

  if (loading || !user) return <div className="p-6">Загрузка...</div>;
  return <>{children(user)}</>;
}
