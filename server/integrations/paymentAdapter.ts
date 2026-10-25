import Stripe from "stripe";
import { z } from "zod";

export class PaymentError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export class InvalidSignatureError extends Error {
  constructor() {
    super("Ogiltig webhook-signatur");
    this.name = "InvalidSignatureError";
  }
}

let client: Stripe | null = null;

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PaymentError("Betalningen är inte konfigurerad.", 500);
  client ??= new Stripe(key, { timeout: 8000, maxNetworkRetries: 1 });
  return client;
}

function toPaymentError(err: unknown): PaymentError {
  if (err instanceof PaymentError) return err;
  if (
    err instanceof Stripe.errors.StripeConnectionError ||
    err instanceof Stripe.errors.StripeAPIError ||
    err instanceof Stripe.errors.StripeRateLimitError
  ) {
    console.warn("Stripe svarar inte:", (err as Error).message);
    return new PaymentError(
      "Betalningstjänsten svarar inte just nu. Din order är sparad som obetald, försök igen om en stund.",
      503,
    );
  }
  console.error("Stripe-fel:", err);
  return new PaymentError(
    "Betalningen kunde inte startas just nu. Försök igen senare.",
    502,
  );
}

export interface CheckoutLine {
  name: string;
  unitAmountOre: number;
  quantity: number;
}

export async function createCheckoutSession(input: {
  orderId: string;
  email?: string;
  lines: CheckoutLine[];
}): Promise<{ id: string; url: string }> {
  const clientUrl = process.env.CLIENT_URL?.replace(/\/+$/, "");
  if (!clientUrl)
    throw new PaymentError("Betalningen är inte konfigurerad.", 500);

  try {
    const session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        locale: "sv",
        client_reference_id: input.orderId,
        metadata: { order_id: input.orderId },
        customer_email: input.email,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        line_items: input.lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: "sek",
            unit_amount: l.unitAmountOre,
            product_data: { name: l.name },
          },
        })),
        success_url: `${clientUrl}/order/confirmation?order_id=${encodeURIComponent(input.orderId)}`,
        cancel_url: `${clientUrl}/cart`,
      },
      { idempotencyKey: `checkout-order-${input.orderId}` },
    );
    if (!session.url)
      throw new PaymentError("Stripe gav ingen betalningslänk.", 502);
    return { id: session.id, url: session.url };
  } catch (err) {
    throw toPaymentError(err);
  }
}

export type PaymentEvent =
  | { kind: "paid"; orderId: string; sessionId: string; amountTotal: number }
  | { kind: "expired"; orderId: string; sessionId: string }
  | { kind: "ignored"; type: string };

const SessionSchema = z.object({
  id: z.string(),
  client_reference_id: z.string().min(1),
  payment_status: z.string(),
  amount_total: z.number().int().nullable(),
});

export function parseWebhook(
  rawBody: Buffer,
  signature: string | undefined,
): PaymentEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new PaymentError("Webhooken är inte konfigurerad.", 500);
  if (!signature) throw new InvalidSignatureError();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    if (err instanceof PaymentError) throw err;
    throw new InvalidSignatureError();
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.expired"
  ) {
    return { kind: "ignored", type: event.type };
  }

  const parsed = SessionSchema.safeParse(event.data.object);
  if (!parsed.success) {
    console.error("Oväntat sessionsformat från Stripe:", parsed.error.issues);
    return { kind: "ignored", type: event.type };
  }
  const s = parsed.data;

  if (event.type === "checkout.session.expired") {
    return { kind: "expired", orderId: s.client_reference_id, sessionId: s.id };
  }
  if (s.payment_status !== "paid" || s.amount_total === null) {
    return { kind: "ignored", type: `${event.type} (${s.payment_status})` };
  }
  return {
    kind: "paid",
    orderId: s.client_reference_id,
    sessionId: s.id,
    amountTotal: s.amount_total,
  };
}
