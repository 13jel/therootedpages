import { formatSek } from "../utils/currency";

const METHOD_LABEL = { ombud: "Ombud", hemleverans: "Hemleverans" };

function formatDeliveryDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("sv-SE", {
    weekday: "long",
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  });
}

export default function ShippingSummary({ order }) {
  if (!order?.shipping_method) return null;
  const cost = Number(order.shipping_cost ?? 0);

  return (
    <div className="order-shipping">
      <p>
        Frakt: {METHOD_LABEL[order.shipping_method] ?? order.shipping_method},{" "}
        {cost === 0 ? "0 kr (fri frakt)" : formatSek(cost)}
      </p>
      {order.pickup_point_name && (
        <p>
          Ombud: {order.pickup_point_name}
          {order.pickup_point_address ? `, ${order.pickup_point_address}` : ""}
        </p>
      )}
      {order.estimated_delivery && (
        <p>Beräknad leverans: {formatDeliveryDate(order.estimated_delivery)}</p>
      )}
    </div>
  );
}
