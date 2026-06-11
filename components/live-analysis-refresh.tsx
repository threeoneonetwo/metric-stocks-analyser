"use client";

import { useEffect, useState } from "react";

type LiveAnalysisRefreshProps = {
  ticker: string;
  enabled: boolean;
};

export function LiveAnalysisRefresh({ ticker, enabled }: LiveAnalysisRefreshProps) {
  const [status, setStatus] = useState<"generating" | "ready" | "error">("generating");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function generateFreshReport() {
      try {
        const response = await fetch(`/api/reports/${encodeURIComponent(ticker)}?refresh=1`, {
          method: "POST",
          cache: "no-store",
        });

        if (cancelled) return;

        if (!response.ok) {
          setStatus("error");
          return;
        }

        setStatus("ready");
        window.location.replace(`/r/${encodeURIComponent(ticker)}?fresh=1`);
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void generateFreshReport();

    return () => {
      cancelled = true;
    };
  }, [enabled, ticker]);

  if (!enabled) return null;

  return (
    <div
      className="rounded-xl px-4 py-3 text-xs font-semibold text-[#dae2fd] lg:px-5"
      style={{
        background: "rgba(184,196,255,0.08)",
        border: "1px solid rgba(184,196,255,0.24)",
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-4">
        <span>{status === "error" ? "Live market data loaded" : "Claude analyst brief is refreshing"}</span>
        <span className="text-[10px] uppercase tracking-[0.22em] text-[#8e909f]">
          {status === "ready" ? "Ready" : status === "error" ? "Retry later" : "Live first"}
        </span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full bg-[#b8c4ff] ${status === "error" ? "w-2/3" : "live-progress w-1/2"}`}
          style={{ boxShadow: "0 0 14px rgba(184,196,255,0.9)" }}
        />
      </div>
      <style jsx>{`
        .live-progress {
          animation: metric-live-progress 1.25s ease-in-out infinite;
        }

        @keyframes metric-live-progress {
          0% {
            transform: translateX(-110%);
          }
          100% {
            transform: translateX(210%);
          }
        }
      `}</style>
    </div>
  );
}
