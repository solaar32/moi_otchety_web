-- Supabase PostgreSQL schema for «Мои отчеты»

create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  login text not null unique,
  password_hash text not null,
  role text not null check (role in ('worker', 'admin')),
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_sections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references price_sections(id) on delete cascade,
  name text not null,
  unit text not null default '',
  price_worker numeric(12,2),
  price_cut numeric(12,2),
  price_polish numeric(12,2),
  price_cut_polish numeric(12,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references app_users(id) on delete cascade,
  report_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  order_no text not null,
  section_id uuid references price_sections(id) on delete set null,
  price_item_id uuid references price_items(id) on delete set null,
  operation_name text not null,
  unit text not null default '',
  qty numeric(12,3) not null default 0,
  price numeric(12,2) not null default 0,
  total numeric(12,2) generated always as (qty * price) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  uploaded_by uuid references app_users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  items_count int not null default 0,
  status text not null default 'done'
);

create index if not exists idx_reports_worker_date on reports(worker_id, report_date);
create index if not exists idx_report_items_order_no on report_items(order_no);
create index if not exists idx_price_items_section on price_items(section_id);

-- Demo admin and worker hashes are placeholders.
-- In production create users from the admin screen with bcrypt hashes.
