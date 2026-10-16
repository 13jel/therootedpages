import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  searchProducts,
  getCategories,
} from "../integrations/searchAdapter.js";

const router = Router();

const MAX_PAGE_SIZE = 50;

const SearchQuery = z.object({
  q: z
    .string()
    .trim()
    .max(100, "Sökordet får vara högst 100 tecken")
    .default(""),
  page: z.coerce
    .number({ error: "page måste vara ett tal" })
    .int("page måste vara ett heltal")
    .min(1, "page måste vara minst 1")
    .default(1),
  pageSize: z.coerce
    .number({ error: "pageSize måste vara ett tal" })
    .int("pageSize måste vara ett heltal")
    .min(1, "pageSize måste vara minst 1")
    .max(MAX_PAGE_SIZE, `pageSize får vara högst ${MAX_PAGE_SIZE}`)
    .default(12),
  category: z.string().trim().max(50).optional(),
  inStock: z
    .enum(["true", "false"], { error: "inStock måste vara true eller false" })
    .optional()
    .transform((v) => v === "true"),
  sort: z
    .enum(["relevance", "price_asc", "price_desc"], {
      error: "sort måste vara relevance, price_asc eller price_desc",
    })
    .default("relevance"),
});

router.get(
  "/categories",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json({ data: await getCategories() });
    } catch (err) {
      next(err);
    }
  },
);

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const params = SearchQuery.parse(req.query);
    res.json(await searchProducts(params));
  } catch (err) {
    next(err);
  }
});

export default router;
