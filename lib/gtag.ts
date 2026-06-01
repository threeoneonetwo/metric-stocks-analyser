export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

type GtagCommand = "config" | "event" | "js";

type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: GtagCommand, target: string | Date, params?: GtagParams) => void;
  }
}

export function pageview(url: string) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") {
    return;
  }

  getGtag()("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

export function trackEvent(eventName: string, params: GtagParams = {}) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") {
    return;
  }

  getGtag()("event", eventName, params);
}

function getGtag() {
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    function gtag(...args) {
      window.dataLayer?.push(args);
    };

  return window.gtag;
}
