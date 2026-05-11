export type Role = 'worker' | 'admin';

export type User = {
  id: string;
  login: string;
  name: string;
  role: Role;
  active: boolean;
};

export type PriceSection = {
  id: string;
  name: string;
};

export type PriceItem = {
  id: string;
  sectionId: string;
  name: string;
  unit: string;
  priceWorker: number | null;
  priceCustomer?: number | null;
  priceCut?: number | null;
  pricePolish?: number | null;
  priceCutPolish?: number | null;
};

export type ReportItem = {
  id: string;
  reportId?: string;
  reportDate: string;
  workerName: string;
  orderNo: string;
  section: string;
  operation: string;
  unit: string;
  qty: number;
  price: number;
  total: number;
  customerPrice?: number | null;
  customerTotal?: number | null;
};
