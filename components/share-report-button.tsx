"use client";

import { Check, Share2 } from "lucide-react";
import { useState } from "react";
import { trackEvent } from "@/lib/gtag";
import { trackProductEvent } from "@/lib/product-events";

type ShareReportButtonProps = {
  ticker: string;
  companyName?: string;
  className: string;
  iconSize?: number;
  iconOnly?: boolean;
};

export function ShareReportButton({
  ticker,
  companyName,
  className,
  iconSize = 18,
  iconOnly = false,
}: ShareReportButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied">("idle");
  const label = status === "copied" ? "Copied link" : "Share report";

  async function handleShare() {
    const normalizedTicker = ticker.toUpperCase();
    const reportUrl = `${window.location.origin}/r/${encodeURIComponent(normalizedTicker)}`;
    const title = `${normalizedTicker} analysis by Metric`;
    const text = companyName
      ? `Read this Metric Finance brief on ${companyName}.`
      : `Read this Metric Finance brief on ${normalizedTicker}.`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: reportUrl });
        trackEvent("share_report", {
          event_category: "engagement",
          ticker: normalizedTicker,
          method: "native",
        });
        trackProductEvent({
          eventName: "share_report",
          ticker: normalizedTicker,
          metadata: { method: "native", companyName },
        });
        return;
      }

      await copyToClipboard(reportUrl);
      setStatus("copied");
      trackEvent("share_report", {
        event_category: "engagement",
        ticker: normalizedTicker,
        method: "clipboard",
      });
      trackProductEvent({
        eventName: "share_report",
        ticker: normalizedTicker,
        metadata: { method: "clipboard", companyName },
      });
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      await copyToClipboard(reportUrl);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    }
  }

  return (
    <button type="button" className={className} aria-label={label} onClick={handleShare}>
      {status === "copied" ? <Check size={iconSize} strokeWidth={2.4} /> : <Share2 size={iconSize} strokeWidth={2.2} />}
      {iconOnly ? null : <span>{status === "copied" ? "Copied link" : "Share Report"}</span>}
    </button>
  );
}

async function copyToClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
