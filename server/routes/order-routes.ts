import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { supabaseForUser, supabaseAdmin } from "../supabaseClient.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { AuthRequest } from "../types.js";
import {
  createCheckoutSession,
  type CheckoutLine,
} from "../integrations/paymentAdapter.js";
import { priceItems } from "../integrations/cartPricing.js";
import {
  verifyServicePoint,
  estimateDelivery,
  normalizePostalCode,
  formatPostalCode,
} from "../integrations/postnordAdapter.js";
import {
  SHIPPING_METHODS,
  SHIPPING_LABEL,
  shippingCostOre,
} from "../integrations/shipping.js";

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
  shipping: z.object({
    method: z.enum(SHIPPING_METHODS),
    postalCode: z.string().trim().min(1).max(20),
    servicePointId: z.union([z.string().min(1).max(50), z.number()]).optional(),
  }),
});

const MIN_TOTAL_ORE = 300;

orderRouter.post(
  "/checkout",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = CheckoutBody.parse(req.body);
      const { method } = body.shipping;

      const postalCode = normalizePostalCode(body.shipping.postalCode);
      if (!postalCode) {
        return res
          .status(400)
          .json({ error: "Ange ett svenskt postnummer med fem siffror." });
      }

      const { lines, goodsOre } = await priceItems(body.items);
      if (goodsOre < MIN_TOTAL_ORE) {
        return res
          .status(400)
          .json({ error: "Det minsta beloppet för en betalning är 3 kr." });
      }

      const shippingOre = shippingCostOre(method, goodsOre);
      let pickup: { id: string; name: string; address: string } | null = null;
      if (method === "ombud") {
        if (body.shipping.servicePointId === undefined) {
          return res.status(400).json({ error: "Välj ett ombud." });
        }
        const sp = await verifyServicePoint(
          postalCode,
          String(body.shipping.servicePointId),
        );
        if (!sp) {
          return res.status(400).json({
            error: `Det valda ombudet finns inte för postnummer ${formatPostalCode(postalCode)}. Sök igen och välj ett ombud i listan.`,
          });
        }
        pickup = {
          id: sp.id,
          name: sp.name,
          address: [
            sp.street,
            [sp.postalCode, sp.city].filter(Boolean).join(" "),
          ]
            .filter(Boolean)
            .join(", "),
        };
      }

      let estimatedDelivery: string | null = null;
      try {
        estimatedDelivery = (
          await estimateDelivery(
            postalCode,
            method === "ombud" ? "pickup" : "home",
          )
        ).date;
      } catch (err) {
        console.warn(
          "Ingen leveranstid sparad på ordern:",
          (err as Error).message,
        );
      }

      const totalOre = goodsOre + shippingOre;

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: req.user!.id,
          status: "Obetald",
          total: totalOre / 100,
          shipping_address: body.shipping_address,
          shipping_method: method,
          shipping_cost: shippingOre / 100,
          shipping_postal_code: postalCode,
          pickup_point_id: pickup?.id ?? null,
          pickup_point_name: pickup?.name ?? null,
          pickup_point_address: pickup?.address ?? null,
          estimated_delivery: estimatedDelivery,
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

      const stripeLines: CheckoutLine[] = [...lines];
      if (shippingOre > 0) {
        stripeLines.push({
          name: pickup
            ? `Frakt: ombud (${pickup.name})`
            : `Frakt: ${SHIPPING_LABEL[method].toLowerCase()}`,
          unitAmountOre: shippingOre,
          quantity: 1,
        });
      }
      const session = await createCheckoutSession({
        orderId: String(order.id),
        email: req.user!.email ?? undefined,
        lines: stripeLines,
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
      "id, status, total, created_at, paid_at, shipping_method, shipping_cost, shipping_postal_code, pickup_point_name, pickup_point_address, estimated_delivery, order_items(id, product_name, quantity, unit_price)",
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
