import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { supabaseForUser, supabaseAdmin } from "../supabaseClient.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { AuthRequest } from "../types.js";
import { createCheckoutSession } from "../integrations/paymentAdapter.js";

const orderRouter = Router();

orderRouter.use(requireAuth);

const CheckoutBody = z.object({
  items: z
    .array(
      z.object({
        productId: z.union([z.string().min(1), z.number()]),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  shipping_address: z.string().trim().min(1).max(500),
});

const MIN_TOTAL_ORE = 300;

orderRouter.post(
  "/checkout",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = CheckoutBody.parse(req.body);

      const wanted = new Map<string, number>();
      for (const i of body.items) {
        const key = String(i.productId);
        wanted.set(key, (wanted.get(key) ?? 0) + i.quantity);
      }

      const { data: products, error: prodError } = await supabaseAdmin
        .from("products")
        .select("id, name, price, stock, is_active")
        .in("id", [...wanted.keys()]);
      if (prodError) {
        console.error("Kunde inte hämta produkter:", prodError);
        return res.status(500).json({ error: "Kunde inte läsa varukorgen." });
      }
      const byId = new Map((products ?? []).map((p: any) => [String(p.id), p]));

      const lines: {
        productId: any;
        name: string;
        unitAmountOre: number;
        quantity: number;
      }[] = [];
      for (const [key, quantity] of wanted) {
        const p: any = byId.get(key);
        if (!p || p.is_active === false) {
          return res
            .status(400)
            .json({
              error: "En av produkterna i varukorgen finns inte längre.",
            });
        }
        if (p.stock < quantity) {
          return res.status(409).json({
            error:
              p.stock <= 0
                ? `"${p.name}" är slut i lager.`
                : `Det finns bara ${p.stock} st kvar av "${p.name}".`,
          });
        }
        lines.push({
          productId: p.id,
          name: p.name,
          unitAmountOre: Math.round(Number(p.price) * 100),
          quantity,
        });
      }

      const totalOre = lines.reduce(
        (s, l) => s + l.unitAmountOre * l.quantity,
        0,
      );
      if (totalOre < MIN_TOTAL_ORE) {
        return res
          .status(400)
          .json({ error: "Det minsta beloppet för en betalning är 3 kr." });
      }

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: req.user!.id,
          status: "Obetald",
          total: totalOre / 100,
          shipping_address: body.shipping_address,
        })
        .select("id")
        .single();
      if (orderError || !order) {
        console.error("Kunde inte skapa order:", orderError);
        return res.status(500).json({ error: "Kunde inte skapa ordern." });
      }

      const { error: itemsError } = await supabaseAdmin
        .from("order_items")
        .insert(
          lines.map((l) => ({
            order_id: order.id,
            product_id: l.productId,
            product_name: l.name,
            quantity: l.quantity,
            unit_price: l.unitAmountOre / 100,
          })),
        );
      if (itemsError) {
        console.error("Kunde inte skapa orderrader:", itemsError);
        await supabaseAdmin
          .from("orders")
          .update({ status: "Avbruten" })
          .eq("id", order.id);
        return res.status(500).json({ error: "Kunde inte skapa ordern." });
      }

      const session = await createCheckoutSession({
        orderId: String(order.id),
        email: req.user!.email ?? undefined,
        lines,
      });

      const { error: sessError } = await supabaseAdmin
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);
      if (sessError) console.error("Kunde inte spara session-id:", sessError);

      res.status(201).json({ orderId: order.id, url: session.url });
    } catch (err) {
      next(err);
    }
  },
);

orderRouter.get("/", requireAdmin, async (_req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*, profiles(email), order_items(*, products(name))")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

orderRouter.get("/mine", async (req: AuthRequest, res: Response) => {
  const sb = supabaseForUser(req.token!);
  const { data, error } = await sb
    .from("orders")
    .select("*, order_items(*, products(name))")
    .eq("user_id", req.user!.id)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

orderRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  const sb = supabaseForUser(req.token!);
  const { data, error } = await sb
    .from("orders")
    .select(
      "id, status, total, created_at, paid_at, order_items(id, product_name, quantity, unit_price)",
    )
    .eq("id", req.params.id)
    .eq("user_id", req.user!.id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.warn("Orderhämtning:", error.message);
    return res.status(404).json({ error: "Ordern hittades inte." });
  }
  res.json(data);
});

const StatusBody = z.object({
  status: z.enum(["Behandlas", "Levererad", "Återbetald"]),
});

orderRouter.patch(
  "/:id/status",
  requireAdmin,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { status } = StatusBody.parse(req.body);
      const { data, error } = await supabaseAdmin
        .from("orders")
        .update({ status })
        .eq("id", req.params.id)
        .in("status", ["Beställd", "Behandlas", "Levererad", "Återbetald"])
        .select()
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!data) {
        return res.status(409).json({
          error:
            "Ordern är obetald eller avbruten och kan inte få den statusen.",
        });
      }
      res.json(data);
    } catch (err) {
      next(err);
    }
  },
);

export default orderRouter;
