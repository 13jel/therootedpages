import { Router, Response } from "express";
import { supabaseAdmin } from "./supabaseClient.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";
import { AuthRequest } from "./types.js";
import {
  fetchSupplierCatalog,
  SupplierError,
  type ImportFormat,
  type MappedProduct,
} from "./integrations/supplierAdapter.js";

const router = Router();

const DEFAULT_BRANSCH = process.env.SUPPLIER_BRANSCH || "posters";

router.post(
  "/:format",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const format = req.params.format as ImportFormat;
    if (format !== "csv" && format !== "xml") {
      return res
        .status(400)
        .json({ error: "Format måste vara csv eller xml." });
    }

    const bransch = String(req.query.bransch || DEFAULT_BRANSCH);
    if (!/^[a-z]+$/.test(bransch)) {
      return res.status(400).json({ error: "Ogiltig bransch." });
    }

    try {
      const { products, skipped, total } = await fetchSupplierCatalog(
        format,
        bransch,
      );

      const { data: existing, error: readError } = await supabaseAdmin
        .from("products")
        .select("sku, name, category, price, stock, ean, variants")
        .in(
          "sku",
          products.map((p) => p.sku),
        );
      if (readError) throw new Error(readError.message);

      const existingBySku = new Map(
        (existing ?? []).map((row: any) => [row.sku, row]),
      );

      const toWrite: MappedProduct[] = [];
      let created = 0;
      let updated = 0;
      let unchanged = 0;

      for (const p of products) {
        const old: any = existingBySku.get(p.sku);
        if (!old) {
          created++;
          toWrite.push(p);
        } else if (hasChanged(old, p)) {
          updated++;
          toWrite.push(p);
        } else {
          unchanged++;
        }
      }

      if (toWrite.length > 0) {
        const { error: writeError } = await supabaseAdmin
          .from("products")
          .upsert(toWrite, { onConflict: "sku" });
        if (writeError) throw new Error(writeError.message);
      }

      return res.json({
        format,
        bransch,
        total,
        created,
        updated,
        unchanged,
        skipped,
      });
    } catch (err) {
      if (err instanceof SupplierError) {
        return res.status(err.status).json({ error: err.message });
      }
      console.error("Importfel:", err);
      return res.status(500).json({
        error:
          "Importen misslyckades. Inget har ändrats i onödan, försök igen.",
      });
    }
  },
);

function hasChanged(old: any, p: MappedProduct): boolean {
  return (
    old.name !== p.name ||
    old.category !== p.category ||
    Number(old.price) !== p.price ||
    Number(old.stock) !== p.stock ||
    (old.ean ?? null) !== p.ean ||
    JSON.stringify(old.variants ?? []) !== JSON.stringify(p.variants)
  );
}

export default router;
