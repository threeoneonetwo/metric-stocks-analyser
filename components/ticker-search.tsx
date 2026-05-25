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
      className="surface flex w-full max-w-2xl items-center gap-3 rounded p-2"
    >
      <Search className="ml-2 shrink-0" size={20} strokeWidth={1.8} />
      <input
        autoFocus
        aria-label="Stock ticker"
        placeholder="RELIANCE"
        className="min-w-0 flex-1 bg-transparent px-1 py-3 text-lg font-medium uppercase outline-none placeholder:text-black/35"
        {...form.register("ticker", {
          setValueAs: normalizeTicker,
        })}
        onInput={(event) => {
          event.currentTarget.value = normalizeTicker(event.currentTarget.value);
        }}
      />
      <button className="h-12 rounded bg-black px-5 font-mono text-xs uppercase text-metric-yellow">
        Analyze
      </button>
    </form>
  );
}
