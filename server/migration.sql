alter table public.products
  add column if not exists sku varchar,
  add column if not exists ean varchar,
  add column if not exists variants jsonb not null default '[]'::jsonb,
  add column if not exists source varchar,
  add column if not exists supplier_updated_at timestamptz;

create unique index if not exists products_sku_key on public.products (sku);