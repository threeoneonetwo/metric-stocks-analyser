"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { normalizeTicker } from "@/lib/utils";

const tickerSchema = z.object({
  ticker: z.string().min(1, "Enter an NSE or BSE ticker").max(20),
});

type TickerForm = z.infer<typeof tickerSchema>;

export function TickerSearch() {
  const router = useRouter();
  const form = useForm<TickerForm>({
    resolver: zodResolver(tickerSchema),
    defaultValues: { ticker: "" },
  });

  function onSubmit(values: TickerForm) {
    const ticker = normalizeTicker(values.ticker);
    if (ticker) {
      router.push(`/analyze/${ticker}`);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-0 neo-shadow sm:flex-row"
    >
      <label className="flex min-w-0 flex-1 items-center gap-3 border-4 border-black bg-white px-4 py-3">
        <Search className="shrink-0" size={20} strokeWidth={2.2} />
        <input
          autoFocus
          aria-label="Stock ticker"
          placeholder="ENTER TICKER (E.G. RELIANCE)..."
          className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold uppercase tracking-[0.05em] outline-none placeholder:text-metric-surface-dim"
          {...form.register("ticker", {
            setValueAs: normalizeTicker,
          })}
          onInput={(event) => {
            event.currentTarget.value = normalizeTicker(event.currentTarget.value);
          }}
        />
      </label>
      <button className="neo-press border-4 border-t-0 border-black bg-black px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.05em] text-white hover:bg-metric-green hover:text-white sm:border-l-0 sm:border-t-4">
        Analyze
      </button>
    </form>
  );
}
