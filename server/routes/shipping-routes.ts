import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { AuthRequest } from "../types.js";
import { priceItems } from "../integrations/cartPricing.js";
import {
  findServicePoints,
  estimateDelivery,
  normalizePostalCode,
  formatPostalCode,
  PostnordError,
} from "../integrations/postnordAdapter.js";
import {
  SHIPPING_METHODS,
  SHIPPING_LABEL,
  FREE_SHIPPING_THRESHOLD_ORE,
  shippingCostOre,
  type ShippingMethod,
} from "../integrations/shipping.js";

const shippingRouter = Router();
shippingRouter.use(requireAuth);

const QuoteBody = z.object({
  items: z
    .array(
      z.object({
        productId: z.union([z.string().min(1), z.number()]),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
  postalCode: z.string().trim().min(1).max(20),
});

const errText = (r: PromiseRejectedResult) =>
  r.reason instanceof PostnordError
    ? r.reason.message
    : "Frakttjänsten svarar inte just nu.";

shippingRouter.post(
  "/quote",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = QuoteBody.parse(req.body);
      const postalCode = normalizePostalCode(body.postalCode);
      if (!postalCode) {
        return res
          .status(400)
          .json({ error: "Ange ett svenskt postnummer med fem siffror." });
      }

      const { goodsOre } = await priceItems(body.items);

      const [points, tPickup, tHome] = await Promise.allSettled([
        findServicePoints(postalCode),
        estimateDelivery(postalCode, "pickup"),
        estimateDelivery(postalCode, "home"),
      ]);

      const options = SHIPPING_METHODS.map((method: ShippingMethod) => {
        const t = method === "ombud" ? tPickup : tHome;
        const costOre = shippingCostOre(method, goodsOre);
        return {
          method,
          label: SHIPPING_LABEL[method],
          price: costOre / 100,
          free: costOre === 0,
          estimatedDelivery:
            t.status === "fulfilled"
              ? { date: t.value.date, label: t.value.label }
              : null,
        };
      });

      res.json({
        postalCode,
        postalCodeFormatted: formatPostalCode(postalCode),
        goods: goodsOre / 100,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD_ORE / 100,
        options,
        servicePoints: points.status === "fulfilled" ? points.value : [],
        servicePointsError:
          points.status === "rejected"
            ? errText(points)
            : points.value.length === 0
              ? "Inga ombud hittades för det postnumret."
              : null,
        deliveryError:
          tPickup.status === "rejected" && tHome.status === "rejected"
            ? errText(tPickup)
            : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

export default shippingRouter;
