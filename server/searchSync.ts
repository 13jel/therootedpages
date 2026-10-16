import { supabaseAdmin } from "./supabaseClient.js";
import {
  indexProducts,
  removeProducts,
  clearAndIndex,
  configureIndex,
  type SearchRecord,
} from "./integrations/searchAdapter.js";

export function toRecord(row: any): SearchRecord {
  return {
    objectID: row.sku || `P-${row.id}`,
    id: row.id,
    sku: row.sku ?? null,
    name: row.name,
    description: row.description ?? null,
    category: row.category ?? null,
    color: row.color ?? null,
    price: Number(row.price),
    stock: Number(row.stock ?? 0),
    inStock: Number(row.stock ?? 0) > 0,
    image_url: row.image_url ?? null,
  };
}

export const objectIdFor = (row: { sku?: string | null; id: number }) =>
  row.sku || `P-${row.id}`;

export async function safeSync(task: () => Promise<void>): Promise<boolean> {
  try {
    await task();
    return true;
  } catch (err) {
    console.error("Sökindexet kunde inte uppdateras:", (err as Error).message);
    return false;
  }
}

export const syncRows = (rows: any[]) =>
  safeSync(async () => {
    const active = rows.filter((r) => r.is_active !== false);
    const inactive = rows.filter((r) => r.is_active === false);
    await indexProducts(active.map(toRecord));
    await removeProducts(inactive.map(objectIdFor));
  });

export const syncIds = (ids: number[]) =>
  safeSync(async () => {
    const { data, error } = await supabaseAdmin.from("products").select("*").in("id", ids);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    await indexProducts(rows.filter((r: any) => r.is_active !== false).map(toRecord));
    await removeProducts(rows.filter((r: any) => r.is_active === false).map(objectIdFor));
  });

export const removeRows = (rows: { sku?: string | null; id: number }[]) =>
  safeSync(() => removeProducts(rows.map(objectIdFor)));

export async function fullReindex(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  await configureIndex();
  await clearAndIndex((data ?? []).map(toRecord));
  return data?.length ?? 0;
}