"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const tickerSchema = z.object({
  query: z.string().trim().min(1, "Enter a company name or ticker").max(80),
});

type TickerForm = z.infer<typeof tickerSchema>;

export function TickerSearch() {
  const router = useRouter();
  const form = useForm<TickerForm>({
    resolver: zodResolver(tickerSchema),
    defaultValues: { query: "" },
  });

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

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex w-full flex-col gap-0 neo-shadow"
    >
      <label className="flex min-w-0 flex-1 items-center gap-3 border-4 border-black bg-metric-finance-accent-soft px-4 py-3">
        <Search className="shrink-0" size={20} strokeWidth={2.2} />
        <input
          autoFocus
          aria-label="Company name or stock ticker"
          placeholder="ENTER COMPANY OR TICKER..."
          className="min-w-0 flex-1 bg-transparent font-mono text-sm font-bold uppercase tracking-[0.05em] text-black outline-none placeholder:text-metric-blue"
          {...form.register("query")}
        />
      </label>
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
