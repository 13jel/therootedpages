import { Router, Request, Response } from "express";
import { supabaseAdmin } from "./supabaseClient.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";
import { AuthRequest } from "./types.js";

const collectionRouter = Router();

collectionRouter.get("/", async (req: Request, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("collections")
    .select("*")
    .order("name", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

collectionRouter.post(
  "/",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;
    const { data, error } = await supabaseAdmin
      .from("collections")
      .insert({ name, description })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  },
);

collectionRouter.put(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const { name, description } = req.body;
    const { data, error } = await supabaseAdmin
      .from("collections")
      .update({ name, description })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  },
);

collectionRouter.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const { error } = await supabaseAdmin
      .from("collections")
      .delete()
      .eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.status(204).send();
  },
);

export default collectionRouter;
