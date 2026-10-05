import { Router, Request, Response } from "express";
import { supabaseAdmin } from "./supabaseClient.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";
import { AuthRequest } from "./types.js";

const productsRouter = Router();

productsRouter.get("/", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*, collections(id, name)")
    .eq("is_active", true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

productsRouter.get("/:id", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(
      "*, product_images(id, image_url, sort_order), collections(id, name)",
    )
    .eq("id", req.params.id)
    .eq("is_active", true)
    .order("sort_order", { foreignTable: "product_images", ascending: true })
    .single();
  if (error) return res.status(404).json({ error: "Produkten hittades inte" });
  res.json(data);
});

productsRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const {
      name,
      description,
      price,
      stock,
      image_url,
      category,
      theme,
      collection_id,
    } = req.body;
    const { data, error } = await supabaseAdmin
      .from("products")
      .insert({
        name,
        description,
        price,
        stock,
        image_url,
        category,
        theme,
        collection_id: collection_id || null,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  },
);

productsRouter.put(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const {
      name,
      description,
      price,
      stock,
      image_url,
      category,
      theme,
      collection_id,
    } = req.body;
    const { data, error } = await supabaseAdmin
      .from("products")
      .update({
        name,
        description,
        price,
        stock,
        image_url,
        category,
        theme,
        collection_id: collection_id || null,
      })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  },
);

productsRouter.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from("products")
      .update({ is_active: false })
      .eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  },
);

export default productsRouter;
