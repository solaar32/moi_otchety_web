use client';

import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { RequireUser } from '@/components/RequireUser';

type ImportedSection = {
  name: string;
  items: {
    name: string;
    unit: string;
    priceCustomer: number | null;
    priceWorker: number | null;
    priceCutPolish?: number | null;
    priceCut?: number | null;
    pricePolish?: number | null;
  }[];
};

export default function PricesPage() {
  const [sections, setSections] = useState<ImportedSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError('');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/import-price', { method: 'POST', body: form });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error ?? 'Ошибка загрузки');
      return;
    }
    setSections(json.sections);
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Прайс Excel" role="Работодатель">
          <div className="card p-4 mb-4 space-y-3">
            <h2 className="text-lg font-bold">Загрузка прайса</h2>
            <input className="input" type="file" accept=".xlsx,.xls" onChange={(e) => upload(e.target.files?.[0] ?? null)} />
            {loading && <div className="text-sm text-slate-600">Читаю Excel...</div>}
            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <div key={section.name} className="card p-4">
                <h3 className="font-bold">{section.name}</h3>
                <p className="text-sm text-slate-600">Позиций: {section.items.length}</p>
                <div className="mt-3 max-h-64 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--brand-soft)] text-left">
                      <tr>
                        <th className="p-2">Операция</th>
                        <th className="p-2">Ед.</th>
                        <th className="p-2 text-right">Цена заказчика</th>
                        <th className="p-2 text-right">Цена работника</th>
                        {section.name === 'Декоративка' && (
                          <>
                            <th className="p-2 text-right">Р+П</th>
                            <th className="p-2 text-right">Резка</th>
                            <th className="p-2 text-right">Полировка</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {section.items.slice(0, 30).map((item, idx) => (
                        <tr key={idx} className="border-t border-[var(--line)]">
                          <td className="p-2">{item.name}</td>
                          <td className="p-2">{item.unit}</td>
                          <td className="p-2 text-right">{item.priceCustomer ?? '-'}</td>
                          <td className="p-2 text-right">{item.priceWorker ?? '-'}</td>
                          {section.name === 'Декоративка' && (
                            <>
                              <td className="p-2 text-right">{item.priceCutPolish ?? '-'}</td>
                              <td className="p-2 text-right">{item.priceCut ?? '-'}</td>
                              <td className="p-2 text-right">{item.pricePolish ?? '-'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}
