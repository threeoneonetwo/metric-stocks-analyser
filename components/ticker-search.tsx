"use client";

import { Clock3, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const tickerSchema = z.object({
  query: z.string().trim().min(1, "Enter a company name or ticker").max(80),
});

type TickerForm = z.infer<typeof tickerSchema>;
type SearchSuggestion = {
  ticker: string;
  symbol?: string;
  companyName?: string;
  name?: string;
  exchange?: "NSE" | "BSE";
  sector?: string | null;
  industry?: string | null;
  meta?: string;
  source?: "static" | "live";
};

const searchSuggestions: SearchSuggestion[] = [
  { ticker: "RELIANCE", name: "Reliance Industries", meta: "Most searched", source: "static" },
  { ticker: "HDFCBANK", name: "HDFC Bank", meta: "Banking", source: "static" },
  { ticker: "TCS", name: "Tata Consultancy Services", meta: "IT services", source: "static" },
  { ticker: "INFY", name: "Infosys", meta: "IT services", source: "static" },
  { ticker: "TATAMOTORS", name: "Tata Motors", meta: "Autos", source: "static" },
  { ticker: "BHARTIARTL", name: "Bharti Airtel", meta: "Telecom", source: "static" },
  ];

export function TickerSearch({ dark = false }: { dark?: boolean }) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveSuggestions, setLiveSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const form = useForm<TickerForm>({
    resolver: zodResolver(tickerSchema),
    defaultValues: { query: "" },
  });
  const query = form.watch("query").trim();
  const visibleSuggestions = query ? liveSuggestions : searchSuggestions;
  const queryField = form.register("query");

  useEffect(() => {
    function handleMoverSelect(event: Event) {
      const ticker = (event as CustomEvent<{ ticker: string }>).detail.ticker;
      form.setValue("query", ticker, { shouldValidate: false });
      setTimeout(() => openSuggestion(ticker), 500);
    }
    window.addEventListener("mover-select", handleMoverSelect);
    return () => window.removeEventListener("mover-select", handleMoverSelect);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setLiveSuggestions([]);
      setSearchState("idle");
      return;
    }

    const controller = new AbortController();
    setSearchState("loading");
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/resolve?query=${encodeURIComponent(query)}&suggest=1`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          results?: SearchSuggestion[];
        };

        setLiveSuggestions((payload.results ?? []).map((item) => ({ ...item, source: "live" })));
        setSearchState("ready");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLiveSuggestions([]);
          setSearchState("ready");
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query]);

  async function onSubmit(values: TickerForm) {
    const query = values.query.trim();
    setIsNavigating(true);
    await openReport(query);
  }

  async function openSuggestion(ticker: string) {
    setIsNavigating(true);
    setIsDropdownOpen(false);
    form.setValue("query", ticker, { shouldValidate: true });
    await openReport(ticker);
  }

  function stopProgress() {
    if (progressRef.current) clearTimeout(progressRef.current);
    setProgress(100);
  }

  async function openReport(ticker: string) {
    setProgress(1);
    try {
      // Phase 1: resolve ticker (~1s) → fills first 15%
      const resolveRes = await fetch(`/api/resolve?query=${encodeURIComponent(ticker)}`);
      const resolveData = (await resolveRes.json()) as { result?: { ticker: string } };
      const resolved = resolveData.result?.ticker ?? ticker;
      setProgress(15);

      // Phase 2: report generation (~10-20s) → time-based creep from 15% to 97%
      const startTime = Date.now();
      const estimatedMs = 16000;
      const creep = () => {
        const elapsed = Date.now() - startTime;
        const ratio = Math.min(0.97, elapsed / estimatedMs);
        // ease-out so it slows near the end
        const eased = 1 - Math.pow(1 - ratio, 2);
        setProgress(Math.round(15 + eased * 82));
        if (ratio < 0.97) {
          progressRef.current = setTimeout(creep, 250);
        }
      };
      progressRef.current = setTimeout(creep, 250);

      await fetch(`/api/reports/${encodeURIComponent(resolved)}`, { method: "POST" });
      stopProgress();
      window.location.assign(`/r/${encodeURIComponent(resolved)}`);
    } catch {
      stopProgress();
      window.location.assign(`/analyze/${encodeURIComponent(ticker)}`);
    }
  }

  function closeSuggestions() {
    setIsDropdownOpen(false);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  if (dark) {
    return (
      <div ref={containerRef} className="w-full" style={{ position: "relative" }}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex w-full flex-col gap-0"
          onBlur={() => window.setTimeout(() => setIsDropdownOpen(false), 120)}
        >
          <div
            className="flex items-center p-1.5 rounded-xl transition-all duration-300"
            style={{ position: "relative", background: "rgba(23,31,51,0.6)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}
          >
            <Search className="shrink-0 ml-3 text-[#90909a]" size={18} strokeWidth={2} />
            <input
              aria-label="Company name or stock ticker"
              aria-expanded={isDropdownOpen}
              aria-haspopup="listbox"
              aria-controls="ticker-search-dropdown-dark"
              placeholder="Search ticker (e.g. HDFCBANK)"
              role="combobox"
              suppressHydrationWarning
              className="flex-grow bg-transparent border-none text-white placeholder:text-[#90909a] focus:ring-0 text-base py-3 px-3 outline-none"
              name={queryField.name}
              ref={queryField.ref}
              onBlur={queryField.onBlur}
              onChange={(event) => { setIsDropdownOpen(true); void queryField.onChange(event); }}
              onFocus={() => setIsDropdownOpen(true)}
              onClick={() => setIsDropdownOpen(true)}
            />
            <button
              className="rounded-lg mr-1 text-[#0b1326] bg-[#b8c4ff] hover:bg-[#dde1ff] active:scale-95 transition-all disabled:cursor-wait disabled:opacity-70 shrink-0"
              style={{ padding: "6px 10px", fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: "12px", letterSpacing: "0.05em", minWidth: 60 }}
              disabled={form.formState.isSubmitting || isNavigating}
            >
              {(form.formState.isSubmitting || isNavigating) ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: "50%",
                      border: "2px solid rgba(11,19,38,0.25)",
                      borderTopColor: "#0b1326",
                      display: "inline-block",
                      animation: "btn-spin 0.7s linear infinite",
                      flexShrink: 0,
                    }}
                  />
                  {progress}%
                </span>
              ) : "RUN"}
            </button>
            {/* Progress bar overlaid at the bottom of the search box */}
            {(form.formState.isSubmitting || isNavigating) && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    background: "#b8c4ff",
                    boxShadow: "0 0 8px #b8c4ff",
                    transition: "width 0.25s ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Shimmer sweep */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                    animation: "bar-shimmer 1.2s ease-in-out infinite",
                  }} />
                </div>
              </div>
            )}
            <style>{`
              @keyframes btn-spin { to { transform: rotate(360deg); } }
              @keyframes bar-shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(200%); }
              }
            `}</style>
          </div>
          {form.formState.errors.query?.message ? (
            <p className="mt-2 text-xs text-[#f43f5e]" style={{ fontFamily: "Arial, sans-serif" }}>{form.formState.errors.query.message}</p>
          ) : null}
        </form>
        {isDropdownOpen && visibleSuggestions.length > 0 ? (
          <div
            id="ticker-search-dropdown-dark"
            role="listbox"
            className="rounded-xl overflow-hidden search-dropdown"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              right: 0,
              background: "#080f1e",
              border: "1px solid rgba(255,255,255,0.12)",
              zIndex: 99999,
              boxShadow: "0 24px 48px rgba(0,0,0,0.95)",
            }}
            onMouseDown={(event) => event.preventDefault()}
          >
            <div className="search-dropdown-list max-h-72 overflow-y-auto">
              {visibleSuggestions.map((item, index) => (
                <button
                  key={`${item.symbol ?? item.ticker}-${index}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  onClick={() => openSuggestion(item.ticker)}
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-sm font-bold text-white uppercase tracking-wide">{item.ticker}</span>
                    <span className="block truncate text-xs text-[#8e909f] mt-0.5">{item.companyName ?? item.name}</span>
                  </span>
                  <span className="shrink-0 text-[10px] text-[#b8c4ff] font-mono">{item.meta ?? item.exchange ?? "NSE"}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-0 neo-shadow"
      onBlur={() => window.setTimeout(() => setIsDropdownOpen(false), 120)}
    >
      <label className="flex min-w-0 flex-1 items-center gap-3 border-4 border-black bg-metric-finance-accent-soft px-4 py-2">
        <Search className="shrink-0" size={18} strokeWidth={2.2} />
        <input
          aria-label="Company name or stock ticker"
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
          aria-controls="ticker-search-dropdown"
          placeholder="ENTER COMPANY OR TICKER..."
          role="combobox"
          suppressHydrationWarning
          className="min-w-0 flex-1 bg-transparent font-mono text-xs font-bold uppercase tracking-[0.05em] text-black outline-none placeholder:text-metric-blue"
          name={queryField.name}
          ref={queryField.ref}
          onBlur={queryField.onBlur}
          onChange={(event) => {
            setIsDropdownOpen(true);
            void queryField.onChange(event);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onClick={() => setIsDropdownOpen(true)}
        />
      </label>
      {isDropdownOpen ? (
        <div
          id="ticker-search-dropdown"
          role="listbox"
          className="search-dropdown border-x-4 border-b-4 border-black bg-white"
          onMouseDown={(event) => event.preventDefault()}
        >
          <div className="flex items-center justify-between gap-3 border-b-2 border-black bg-metric-surface-variant px-4 py-3">
            <div className="flex min-w-0 items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.08em] text-metric-muted">
              <TrendingUp size={16} strokeWidth={2.4} />
              {query ? "Matching stocks" : "Trending searches"}
            </div>
            <button
              type="button"
              aria-label="Close search suggestions"
              className="neo-press flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black bg-white text-black hover:bg-metric-finance-accent-soft"
              onClick={closeSuggestions}
            >
              <X size={16} strokeWidth={2.8} />
            </button>
          </div>
          <div className="search-dropdown-list grid overflow-y-auto">
            {searchState === "loading" ? (
              <div className="px-4 py-5 font-mono text-xs font-bold uppercase leading-5 tracking-[0.06em] text-metric-muted">
                Searching NSE/BSE stocks...
              </div>
            ) : visibleSuggestions.length > 0 ? (
              visibleSuggestions.map((item, index) => (
                <button
                  key={`${item.symbol ?? item.ticker}-${index}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  className="flex items-center justify-between gap-4 border-b-2 border-black px-4 py-4 text-left transition last:border-b-0 hover:bg-metric-finance-accent-soft"
                  onClick={() => openSuggestion(item.ticker)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {index === 0 && !query ? (
                      <Sparkles className="shrink-0 text-metric-muted" size={18} strokeWidth={2.3} />
                    ) : (
                      <Clock3 className="shrink-0 text-metric-muted" size={18} strokeWidth={2.3} />
                    )}
                    <span className="min-w-0">
                      <span className="block font-mono text-sm font-extrabold uppercase tracking-[0.08em] text-black">
                        {item.ticker}
                      </span>
                      <span className="block truncate text-xs font-bold uppercase tracking-[0.04em] text-metric-muted">
                        {item.companyName ?? item.name}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-metric-blue">
                    {item.meta ?? item.sector ?? item.exchange ?? "NSE/BSE"}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 font-mono text-xs font-bold uppercase leading-5 tracking-[0.06em] text-metric-muted">
                No matched listed stock yet. Press analyze to try the closest match.
              </div>
            )}
          </div>
        </div>
      ) : null}
      <button
        className="neo-press border-4 border-t-0 border-black bg-black px-8 py-2.5 font-mono text-sm font-bold uppercase tracking-[0.05em] text-white hover:bg-metric-green hover:text-white disabled:cursor-wait disabled:opacity-70"
        disabled={form.formState.isSubmitting || isNavigating}
      >
        {form.formState.isSubmitting || isNavigating ? "Loading..." : "Analyze"}
      </button>
      {form.formState.isSubmitting || isNavigating ? (
        <div className="border-x-4 border-b-4 border-black bg-white p-1">
          <div className="h-3 overflow-hidden border-2 border-black bg-metric-surface-variant">
            <div className="search-submit-loader h-full w-1/2 bg-metric-finance-accent" />
          </div>
        </div>
      ) : null}
      {form.formState.errors.query?.message ? (
        <p className="border-4 border-t-0 border-black bg-white px-4 py-3 font-mono text-xs font-bold uppercase leading-5 text-metric-red">
          {form.formState.errors.query.message}
        </p>
      ) : null}
    </form>
  );
}
