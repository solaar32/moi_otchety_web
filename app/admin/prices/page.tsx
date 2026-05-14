'use client';

import { useEffect, useState } from 'react';
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

type PriceImport = {
  id: number;
  fileName: string;
  version: string;
  sectionsCount: number;
  itemsCount: number;
  uploadedBy: string | null;
  uploadedAt: string;
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ru-RU');
}

export default function PricesPage() {
  const [sections, setSections] = useState<ImportedSection[]>([]);
  const [latest, setLatest] = useState<PriceImport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadLatest() {
    const res = await fetch('/api/price-imports/latest', { cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setLatest(json.priceImport ?? null);
  }

  useEffect(() => {
    loadLatest();
  }, []);

  async function upload(file: File | null) {
    if (!file) return;

    setLoading(true);
    setError('');
    setMessage('');

    const form = new FormData();
    form.append('file', file);

    const res = await fetch('/api/import-price', {
      method: 'POST',
      body: form,
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? 'Ошибка загрузки прайса');
      return;
    }

    setSections(json.sections ?? []);
    setLatest(json.priceImport ?? null);
    setMessage('Прайс успешно загружен. Новые цены будут применяться только к новым операциям.');
  }

  return (
    <RequireUser role="admin">
      {() => (
        <AppShell title="Прайс Excel" role="Работодатель">
          <div className="space-y-5">
            <section className="rounded-[2rem] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h1 className="text-3xl font-black text-slate-900">
                    Прайс Excel
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm text-slate-500">
                    Загружайте новый прайс для будущих работ. Уже внесённые работы не должны пересчитываться при изменении цен или номенклатуры.
                  </p>
                </div>

                <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  Старые отчёты не пересчитываются
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Версия</div>
                <div className="mt-2 text-2xl font-black">
                  {latest?.version ?? '-'}
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Разделов</div>
                <div className="mt-2 text-2xl font-black">
                  {latest?.sectionsCount ?? 0}
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Операций</div>
                <div className="mt-2 text-2xl font-black">
                  {latest?.itemsCount ?? 0}
                </div>
              </div>

              <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">Загружен</div>
                <div className="mt-2 text-sm font-black">
                  {formatDate(latest?.uploadedAt)}
                </div>
              </div>
            </section>

            <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
              <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Загрузить новый прайс</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Поддерживаются файлы Excel: .xlsx и .xls.
                </p>

                <label className="mt-4 block rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center transition hover:border-[var(--brand)]">
                  <div className="text-sm font-bold text-slate-700">
                    Нажмите, чтобы выбрать Excel-файл
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    После загрузки прайс станет активным для новых операций
                  </div>

                  <input
                    className="hidden"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => upload(event.target.files?.[0] ?? null)}
                  />
                </label>

                {loading && (
                  <div className="mt-4 rounded-2xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                    Читаю Excel...
                  </div>
                )}

                {message && (
                  <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                    {message}
                  </div>
                )}

                {error && (
                  <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-5 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="font-black text-slate-800">
                    Важно
                  </div>

                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Новый прайс применяется только к новым операциям.</li>
                    <li>Старые отчёты должны хранить старую цену и сумму.</li>
                    <li>Если позиция удалена из нового прайса, старые работы всё равно должны отображаться.</li>
                    <li>Перед загрузкой прайса на VPS уже настроен hourly backup.</li>
                  </ul>
                </div>
              </section>

              <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black">Текущая версия прайса</h2>

                {latest ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Файл</div>
                      <div className="mt-1 font-black">{latest.fileName}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Версия</div>
                      <div className="mt-1 font-black">{latest.version}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Дата загрузки</div>
                      <div className="mt-1 font-black">{formatDate(latest.uploadedAt)}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Загрузил</div>
                      <div className="mt-1 font-black">{latest.uploadedBy ?? '-'}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Разделов</div>
                      <div className="mt-1 font-black">{latest.sectionsCount}</div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Операций</div>
                      <div className="mt-1 font-black">{latest.itemsCount}</div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    Прайс ещё не загружался.
                  </div>
                )}
              </section>
            </div>

            {sections.length > 0 && (
              <section className="space-y-4">
                <div className="rounded-[2rem] bg-white p-5 shadow-sm">
                  <h2 className="text-xl font-black">Предпросмотр загруженного прайса</h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Показываются первые позиции по каждому разделу для проверки структуры файла.
                  </p>
                </div>

                {sections.map((section) => (
                  <div key={section.name} className="rounded-[2rem] bg-white p-5 shadow-sm">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-black">{section.name}</h3>
                        <p className="text-sm text-slate-500">
                          Позиций: {section.items.length}
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                        Раздел прайса
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-sm">
                        <thead className="bg-[var(--brand-soft)] text-left">
                          <tr>
                            <th className="p-3">Операция</th>
                            <th className="p-3">Ед.</th>
                            <th className="p-3 text-right">Цена работника</th>

                            {section.name === 'Декоративка' && (
                              <>
                                <th className="p-3 text-right">Р+П</th>
                                <th className="p-3 text-right">Резка</th>
                                <th className="p-3 text-right">Полировка</th>
                              </>
                            )}
                          </tr>
                        </thead>

                        <tbody>
                          {section.items.slice(0, 30).map((item, index) => (
                            <tr key={index} className="border-t border-slate-100">
                              <td className="p-3">{item.name}</td>
                              <td className="p-3">{item.unit}</td>
                              <td className="p-3 text-right">{item.priceWorker ?? '-'}</td>

                              {section.name === 'Декоративка' && (
                                <>
                                  <td className="p-3 text-right">{item.priceCutPolish ?? '-'}</td>
                                  <td className="p-3 text-right">{item.priceCut ?? '-'}</td>
                                  <td className="p-3 text-right">{item.pricePolish ?? '-'}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>
        </AppShell>
      )}
    </RequireUser>
  );
}