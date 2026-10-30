import { supabaseAdmin } from "../supabaseClient.js";

export class CartError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "CartError";
  }
}

export interface PricedLine {
  productId: any;
  name: string;
  unitAmountOre: number;
  quantity: number;
}

export async function priceItems(
  items: { productId: string | number; quantity: number }[],
): Promise<{ lines: PricedLine[]; goodsOre: number }> {
  const wanted = new Map<string, number>();
  for (const i of items) {
    const key = String(i.productId);
    wanted.set(key, (wanted.get(key) ?? 0) + i.quantity);
  }

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, name, price, stock, is_active")
    .in("id", [...wanted.keys()]);
  if (error) {
    console.error("Kunde inte hämta produkter:", error);
    throw new CartError("Kunde inte läsa varukorgen.", 500);
  }
  const byId = new Map((products ?? []).map((p: any) => [String(p.id), p]));

  const lines: PricedLine[] = [];
  for (const [key, quantity] of wanted) {
    const p: any = byId.get(key);
    if (!p || p.is_active === false) {
      throw new CartError(
        "En av produkterna i varukorgen finns inte längre.",
        400,
      );
    }
    if (p.stock < quantity) {
      throw new CartError(
        p.stock <= 0
          ? `"${p.name}" är slut i lager.`
          : `Det finns bara ${p.stock} st kvar av "${p.name}".`,
        409,
      );
    }
    lines.push({
      productId: p.id,
      name: p.name,
      unitAmountOre: Math.round(Number(p.price) * 100),
      quantity,
    });
  }
  const goodsOre = lines.reduce((s, l) => s + l.unitAmountOre * l.quantity, 0);
  return { lines, goodsOre };
}
