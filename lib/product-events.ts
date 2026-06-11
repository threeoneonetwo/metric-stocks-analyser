"use client";

type ProductEventPayload = {
  eventName: "landing_view" | "search_open" | "search_submit" | "report_view" | "share_report";
  ticker?: string;
  metadata?: Record<string, unknown>;
};

export function trackProductEvent(payload: ProductEventPayload) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/product-events", blob);
    return;
  }

  void fetch("/api/product-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}
