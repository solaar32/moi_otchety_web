import type { PriceSection, PriceItem, ReportItem, User } from './types';

export const demoUsers: User[] = [
  { id: 'admin-1', login: 'admin', name: 'Работодатель', role: 'admin', active: true },
  { id: 'worker-1', login: 'Иванов', name: 'Иванов Иван', role: 'worker', active: true },
  { id: 'worker-2', login: 'Петров', name: 'Петров Петр', role: 'worker', active: true },
];

export const demoPasswords: Record<string, string> = {
  admin: 'admin123',
  Иванов: '123456',
  Петров: '123456',
};

export const demoSections: PriceSection[] = [
  { id: 's1', name: 'Декоративка' },
  { id: 's2', name: 'Монтаж ритуалка' },
  { id: 's3', name: 'Гравировальные работы' },
  { id: 's4', name: 'Резка Ипатов' },
];

export const demoPriceItems: PriceItem[] = [
  { id: 'p1', sectionId: 's1', name: 'Рез', unit: 'м/п', priceWorker: 200, priceCutPolish: 200 },
  { id: 'p2', sectionId: 's1', name: 'Армирование', unit: 'м/п', priceWorker: 300, priceCut: 100, pricePolish: 200, priceCutPolish: 300 },
  { id: 'p3', sectionId: 's2', name: 'Монтаж плитки', unit: 'м.кв.', priceWorker: 3000 },
  { id: 'p4', sectionId: 's3', name: 'Портрет', unit: 'шт.', priceWorker: 3000 },
];

export const demoReports: ReportItem[] = [
  { id: 'r1', reportDate: '2026-05-11', workerName: 'Иванов Иван', orderNo: '101', section: 'Декоративка', operation: 'Рез', unit: 'м/п', qty: 2, price: 200, total: 400 },
  { id: 'r2', reportDate: '2026-05-11', workerName: 'Иванов Иван', orderNo: '102', section: 'Монтаж ритуалка', operation: 'Монтаж плитки', unit: 'м.кв.', qty: 1.5, price: 3000, total: 4500 },
  { id: 'r3', reportDate: '2026-05-10', workerName: 'Петров Петр', orderNo: '103', section: 'Гравировальные работы', operation: 'Портрет', unit: 'шт.', qty: 1, price: 3000, total: 3000 },
];
