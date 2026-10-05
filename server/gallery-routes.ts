import { Router, Request, Response } from "express";
import { supabaseAdmin } from "./supabaseClient.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";
import { AuthRequest } from "./types.js";

const galleryRouter = Router();

galleryRouter.get("/", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("gallery_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

galleryRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const { title, description, image_url } = req.body;
    const { data, error } = await supabaseAdmin
      .from("gallery_items")
      .insert({ title, description, image_url })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  },
);

galleryRouter.put(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const { title, description, image_url } = req.body;
    const { data, error } = await supabaseAdmin
      .from("gallery_items")
      .update({ title, description, image_url })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  },
);

galleryRouter.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from("gallery_items")
      .delete()
      .eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  },
);

export default galleryRouter;
