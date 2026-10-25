import express, { Router, Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../supabaseClient.js";
import {
  parseWebhook,
  InvalidSignatureError,
  type PaymentEvent,
} from "../integrations/paymentAdapter.js";

const router = Router();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response, next: NextFunction) => {
    if (!Buffer.isBuffer(req.body)) {
      console.error(
        "Webhook-bodyn är inte rå. Montera stripe-webhook före express.json() i server.ts.",
      );
      return res.status(500).json({ error: "Serverfel i webhooken." });
    }

    let event: PaymentEvent;
    try {
      event = parseWebhook(req.body, req.header("stripe-signature"));
    } catch (err) {
      if (err instanceof InvalidSignatureError) {
        return res.status(400).json({ error: "Ogiltig signatur." });
      }
      return next(err);
    }

    try {
      if (event.kind === "paid") await handlePaid(event);
      else if (event.kind === "expired") await handleExpired(event);
      res.json({ received: true });
    } catch (err) {
      console.error("Webhook kunde inte behandlas:", err);
      res.status(500).json({ error: "Kunde inte behandla händelsen." });
    }
  },
);

async function handlePaid(ev: Extract<PaymentEvent, { kind: "paid" }>) {
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, total, status")
    .eq("id", ev.orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) {
    console.warn(`Webhook för okänd order ${ev.orderId}, ignoreras.`);
    return;
  }
  if (order.status !== "Obetald") return;

  if (Math.round(Number(order.total) * 100) !== ev.amountTotal) {
    console.error(
      `Belopp stämmer inte för order ${order.id}: Stripe ${ev.amountTotal} öre, databas ${order.total}. Ordern markeras inte som betald.`,
    );
    return;
  }

  const { data: changed, error: rpcError } = await supabaseAdmin.rpc(
    "mark_order_paid",
    { p_order_id: order.id },
  );
  if (rpcError) throw new Error(rpcError.message);
  if (!changed) return;

  try {
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id")
      .eq("order_id", order.id);
    const ids = (items ?? []).map((i: any) => i.product_id);
    if (ids.length) {
      await supabaseAdmin
        .from("cart_items")
        .delete()
        .eq("user_id", order.user_id)
        .in("product_id", ids);
    }
  } catch (err) {
    console.error("Kunde inte tömma varukorgen efter betalning:", err);
  }
}

async function handleExpired(ev: Extract<PaymentEvent, { kind: "expired" }>) {
  const { error } = await supabaseAdmin
    .from("orders")
    .update({ status: "Avbruten" })
    .eq("id", ev.orderId)
    .eq("status", "Obetald");
  if (error) throw new Error(error.message);
}

export default router;
