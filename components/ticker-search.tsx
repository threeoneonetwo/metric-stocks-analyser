"use client";

import { useRouter } from "next/navigation";
import { Clock3, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const tickerSchema = z.object({
  query: z.string().trim().min(1, "Enter a company name or ticker").max(80),
});

type TickerForm = z.infer<typeof tickerSchema>;

const searchSuggestions = [
  { ticker: "RELIANCE", name: "Reliance Industries", meta: "Most searched" },
  { ticker: "HDFCBANK", name: "HDFC Bank", meta: "Banking" },
  { ticker: "TCS", name: "Tata Consultancy Services", meta: "IT services" },
  { ticker: "INFY", name: "Infosys", meta: "IT services" },
  { ticker: "TATAMOTORS", name: "Tata Motors", meta: "Autos" },
  { ticker: "BHARTIARTL", name: "Bharti Airtel", meta: "Telecom" },
];

export function TickerSearch() {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const form = useForm<TickerForm>({
    resolver: zodResolver(tickerSchema),
    defaultValues: { query: "" },
  });
  const query = form.watch("query").trim();
  const filteredSuggestions = useMemo(() => {
    const normalizedQuery = query.toLowerCase();

    if (!normalizedQuery) {
      return searchSuggestions;
    }

    return searchSuggestions.filter((item) => {
      const searchable = `${item.ticker} ${item.name}`.toLowerCase();
      return searchable.includes(normalizedQuery);
    });
  }, [query]);
  const queryField = form.register("query");

  async function onSubmit(values: TickerForm) {
    const query = values.query.trim();
    const ticker = await resolveTicker(query);
    if (ticker) {
      router.push(`/analyze/${ticker}`);
      return;
    }

    form.setError("query", {
      message: "Could not find that NSE/BSE stock. Try the company name or exact ticker.",
    });
  }

  function openSuggestion(ticker: string) {
    setIsDropdownOpen(false);
    form.setValue("query", ticker, { shouldValidate: true });
    router.push(`/analyze/${ticker}`);
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-0 neo-shadow"
      onBlur={() => window.setTimeout(() => setIsDropdownOpen(false), 120)}
    >
      <label className="flex min-w-0 flex-1 items-center gap-3 border-4 border-black bg-metric-finance-accent-soft px-4 py-3">
        <Search className="shrink-0" size={20} strokeWidth={2.2} />
        <input
          autoFocus
          aria-label="Company name or stock ticker"
          aria-expanded={isDropdownOpen}
          aria-haspopup="listbox"
          aria-controls="ticker-search-dropdown"
          placeholder="ENTER COMPANY OR TICKER..."
          role="combobox"
          className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold uppercase tracking-[0.05em] text-black outline-none placeholder:text-metric-blue"
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
              Trending searches
            </div>
            <button
              type="button"
              aria-label="Close search suggestions"
              className="neo-press flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black bg-white text-black hover:bg-metric-finance-accent-soft"
              onClick={() => setIsDropdownOpen(false)}
            >
              <X size={16} strokeWidth={2.8} />
            </button>
          </div>
          <div className="search-dropdown-list grid overflow-y-auto">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((item, index) => (
                <button
                  key={item.ticker}
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
                        {item.name}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-metric-blue">
                    {item.meta}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-5 font-mono text-xs font-bold uppercase leading-5 tracking-[0.06em] text-metric-muted">
                Press analyze to resolve this company name.
              </div>
            )}
          </div>
        </div>
      ) : null}
      <button
        className="neo-press border-4 border-t-0 border-black bg-black px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-white hover:bg-metric-green hover:text-white disabled:cursor-wait disabled:opacity-70"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Finding..." : "Analyze"}
      </button>
      {form.formState.errors.query?.message ? (
        <p className="border-4 border-t-0 border-black bg-white px-4 py-3 font-mono text-xs font-bold uppercase leading-5 text-metric-red">
          {form.formState.errors.query.message}
        </p>
      ) : null}
    </form>
  );
}

async function resolveTicker(query: string) {
  try {
    const response = await fetch(`/api/resolve?query=${encodeURIComponent(query)}`);
    const payload = (await response.json()) as {
      result?: { ticker?: string };
      error?: string;
    };

    return payload.result?.ticker ?? null;
  } catch {
    return null;
  }
}
