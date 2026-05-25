import Link from "next/link";
import coldStartTickers from "@/data/coldStartTickers.json";
import { FooterBar, TopBar } from "@/components/site-chrome";
import { TickerSearch } from "@/components/ticker-search";

export default function Home() {
  return (
    <main className="min-h-screen pb-14">
      <TopBar />
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="mono-label">NSE and BSE equity research</p>
            <h1 className="max-w-4xl font-serif text-5xl font-bold leading-[0.95] sm:text-7xl">
              Analyze an Indian stock in minutes.
            </h1>
            <p className="max-w-2xl text-base leading-7 sm:text-lg">
              Metric Finance turns market data, peer context, and fresh Indian
              business news into a shareable research report.
            </p>
          </div>
          <TickerSearch />
          <div className="flex flex-wrap gap-2">
            {coldStartTickers.map((item) => (
              <Link
                key={item.ticker}
                href={`/analyze/${item.ticker}`}
                className="rounded-full border border-black bg-metric-yellow px-4 py-2 font-mono text-xs uppercase"
                title={item.name}
              >
                {item.ticker}
              </Link>
            ))}
          </div>
        </div>
        <aside
          id="how-it-works"
          className="surface grid gap-4 rounded-lg p-5 sm:p-6"
        >
          <p className="mono-label">How it works</p>
          <div className="grid gap-4">
            {[
              ["01", "Enter any NSE or BSE ticker."],
              ["02", "Watch the report build while market facts rotate."],
              ["03", "Read nine sections covering valuation, peers, sentiment, and risks."],
            ].map(([step, copy]) => (
              <div key={step} className="grid grid-cols-[44px_1fr] gap-4 border-t border-black pt-4 first:border-t-0 first:pt-0">
                <span className="font-mono text-sm">{step}</span>
                <p className="text-sm leading-6">{copy}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
      <FooterBar />
    </main>
  );
}
