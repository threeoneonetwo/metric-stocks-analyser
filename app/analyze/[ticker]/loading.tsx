"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { FooterBar, TopBar } from "@/components/site-chrome";

export default function AnalyzeRouteLoading() {
  const pathname = usePathname();
  const ticker = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "STOCK").toUpperCase();

  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <section className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col justify-center px-4 py-10 sm:px-6">
        <div className="neo-shadow border-4 border-black bg-black">
          <div className="flex min-w-0 flex-1 items-center gap-3 border-b-4 border-black bg-metric-finance-accent-soft px-4 py-4">
            <Search className="shrink-0" size={22} strokeWidth={2.4} />
            <p className="min-w-0 flex-1 truncate font-mono text-2xl uppercase tracking-[0.04em] text-black">
              {ticker}
            </p>
          </div>
          <div className="px-4 py-5 text-center">
            <p className="font-mono text-sm font-bold uppercase tracking-[0.08em] text-white">
              Analyzing
            </p>
            <div className="mt-4 border-2 border-white bg-black p-1">
              <div className="h-5 overflow-hidden bg-white">
                <div className="analyze-route-loader h-full w-2/3 bg-metric-finance-accent" />
              </div>
            </div>
            <p className="mt-4 font-mono text-[0.7rem] font-bold uppercase leading-5 tracking-[0.08em] text-metric-surface-dim">
              Pulling market data, peers, technicals, and news
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="neo-press mx-auto mt-8 inline-flex border-4 border-black bg-white px-8 py-4 font-mono text-xs font-extrabold uppercase tracking-[0.08em] neo-shadow hover:bg-black hover:text-white"
        >
          Cancel request
        </Link>
      </section>
      <FooterBar />
    </main>
  );
}
