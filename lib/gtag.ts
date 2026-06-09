export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

const OPT_OUT_KEY = "metric_owner";

type GtagCommand = "config" | "event" | "js";

type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (command: GtagCommand, target: string | Date, params?: GtagParams) => void;
    [key: `ga-disable-${string}`]: boolean;
  }
}

export function isOwner() {
  return typeof window !== "undefined" && localStorage.getItem(OPT_OUT_KEY) === "1";
}

export function pageview(url: string) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || isOwner()) {
    return;
  }

  getGtag()("config", GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

export function trackEvent(eventName: string, params: GtagParams = {}) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined" || isOwner()) {
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
