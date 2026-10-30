export type ShippingMethod = "ombud" | "hemleverans";

export const SHIPPING_METHODS = ["ombud", "hemleverans"] as const;

export const SHIPPING_PRICE_ORE: Record<ShippingMethod, number> = {
  ombud: 5900, 
  hemleverans: 9900, 
};

export const SHIPPING_LABEL: Record<ShippingMethod, string> = {
  ombud: "Ombud",
  hemleverans: "Hemleverans",
};

export const FREE_SHIPPING_THRESHOLD_ORE = 50000;

export function shippingCostOre(method: ShippingMethod, goodsOre: number): number {
  if (goodsOre >= FREE_SHIPPING_THRESHOLD_ORE) return 0;
  return SHIPPING_PRICE_ORE[method];
}
