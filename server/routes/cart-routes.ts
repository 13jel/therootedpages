import { Router, Response } from "express";
import { supabaseForUser } from "./supabaseClient.js";
import { requireAuth } from "./middleware/auth.js";
import { AuthRequest } from "./types.js";

const cartRouter = Router();

cartRouter.use(requireAuth);

cartRouter.get("/", async (req: AuthRequest, res: Response) => {
  const sb = supabaseForUser(req.token!);
  const { data, error } = await sb
    .from("cart_items")
    .select("id, quantity, product:products(id, name, price, image_url, stock)")
    .eq("user_id", req.user!.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

cartRouter.post("/", async (req: AuthRequest, res: Response) => {
  const { product_id, quantity } = req.body;
  const sb = supabaseForUser(req.token!);
  const { data, error } = await sb
    .from("cart_items")
    .upsert(
      { user_id: req.user!.id, product_id, quantity },
      { onConflict: "user_id,product_id" },
    )
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

cartRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  const sb = supabaseForUser(req.token!);
  const { error } = await sb
    .from("cart_items")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export default cartRouter;
