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
  status?: string;
  rejectComment?: string | null;
  paymentId?: string | null;
};

export type PaymentLine = {
  id: string;
  workerId: string;
  workerName: string;
  worksTotal: number;
  adjustment: number;
  finalTotal: number;
  note?: string | null;
  itemsCount: number;
};

export type Payment = {
  id: string;
  periodFrom: string;
  periodTo: string;
  status: string;
  total: number;
  paidAt?: string | null;
  createdAt: string;
  lines: PaymentLine[];
};


export type AuditLogItem = {
  id: string;
  actorName?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
};


export type LoginAttemptItem = {
  id: string;
  login: string;
  ip?: string | null;
  userAgent?: string | null;
  success: boolean;
  reason?: string | null;
  createdAt: string;
};
