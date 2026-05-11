'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Role, User } from '@/lib/types';

export function RequireUser({ role, children }: { role: Role; children: (user: User) => React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('moi_otchety_user');
    if (!raw) {
      router.push('/');
      return;
    }
    const parsed = JSON.parse(raw) as User;
    if (parsed.role !== role) {
      router.push(parsed.role === 'admin' ? '/admin' : '/worker');
      return;
    }
    setUser(parsed);
  }, [router, role]);

  if (!user) return <div className="p-6">Загрузка...</div>;
  return <>{children(user)}</>;
}
