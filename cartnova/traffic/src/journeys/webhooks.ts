// Webhook Simulation Journey
// Simulates incoming webhook calls from payment providers and
// shipping partners. These are POST requests with specific payloads
// that would come from external systems in production.

import { api, burstDelay, setClientProfile, pick } from "../http";

const ORDER_IDS = ["ord_em0001", "ord_em0002", "ord_lc0001", "ord_sm0001"];

export async function webhookJourney(): Promise<void> {
  setClientProfile("integration");

  // Payment webhook -- payment provider confirming a charge
  await api("POST", "/api/v2/webhooks/payment", {
    body: {
      event: pick(["payment.confirmed", "payment.failed", "payment.refunded"]),
      payment_id: `pay_${Date.now().toString(36)}`,
      order_id: pick(ORDER_IDS),
      amount: Math.round((10 + Math.random() * 500) * 100) / 100,
      currency: "EUR",
      timestamp: new Date().toISOString(),
    },
  });
  await burstDelay();

  // Shipping webhook -- carrier updating shipment status
  await api("POST", "/api/v2/webhooks/shipping", {
    body: {
      event: pick([
        "shipment.created",
        "shipment.in_transit",
        "shipment.out_for_delivery",
        "shipment.delivered",
        "shipment.failed_delivery",
      ]),
      shipment_id: `shp_${Date.now().toString(36)}`,
      order_id: pick(ORDER_IDS),
      carrier: pick(["PostNL", "DHL", "FedEx", "UPS", "SEUR"]),
      tracking_number: `${Math.random().toString(36).slice(2, 14).toUpperCase()}`,
      timestamp: new Date().toISOString(),
    },
  });
  await burstDelay();

  // Sometimes send multiple rapid webhook events (batch processing)
  if (Math.random() < 0.3) {
    for (let i = 0; i < 3; i++) {
      await api("POST", "/api/v2/webhooks/payment", {
        body: {
          event: "payment.confirmed",
          payment_id: `pay_batch_${Date.now().toString(36)}_${i}`,
          order_id: pick(ORDER_IDS),
          amount: Math.round((10 + Math.random() * 200) * 100) / 100,
          currency: "EUR",
          timestamp: new Date().toISOString(),
        },
      });
      await burstDelay();
    }
  }
}
