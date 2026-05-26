import Link from "next/link";
import coldStartTickers from "@/data/coldStartTickers.json";
import { FooterBar, TopBar } from "@/components/site-chrome";
import { TickerSearch } from "@/components/ticker-search";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <section className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col gap-10 px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="animate-entrance bg-black px-2 py-1 font-mono text-xs font-medium uppercase tracking-[0.1em] text-metric-yellow neo-shadow">
            System status: operational
          </div>
          <h1
            className="animate-entrance delay-1 text-5xl font-extrabold uppercase leading-[0.95] text-black"
            style={{
              fontFamily: "Arial, Helvetica, sans-serif",
              fontWeight: 800,
            }}
          >
            <span className="block">Analyse Indian stocks</span>
            <span className="block">in seconds</span>
          </h1>
          <p className="animate-entrance delay-2 max-w-[32rem] text-base leading-6">
            Our advanced agentic engine monitors the Indian equity market to
            identify high-probability breakout patterns across thousands of
            stocks instantly today.
          </p>
        </div>

        <section className="flex flex-col gap-4">
          <div className="animate-entrance delay-3">
            <TickerSearch />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {coldStartTickers.map((item, index) => (
              <Link
                key={item.ticker}
                href={`/analyze/${item.ticker}`}
                className="neo-press border-2 border-black bg-white px-2 py-1 font-mono text-xs font-bold uppercase tracking-[0.08em] neo-shadow-sm transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-metric-green-bright"
                title={item.name}
                style={{ animationDelay: `${0.4 + index * 0.06}s` }}
              >
                {item.ticker}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4">
          <div className="surface relative overflow-hidden p-6">
            <div className="absolute right-0 top-0 h-8 w-8 border-b-4 border-l-4 border-black bg-metric-green" />
            <h2 className="mb-3 font-mono text-xs font-bold uppercase tracking-[0.1em] text-metric-green">
              Market_pulse_01
            </h2>
            <div className="relative flex h-32 items-center justify-center border-2 border-dashed border-black">
              <div className="scan-fill absolute inset-0 opacity-70" />
              <span className="relative font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
                Scanning Nifty 50...
              </span>
            </div>
          </div>
          <div className="relative border-4 border-black bg-black p-6 text-white neo-shadow">
            <div className="absolute right-0 top-0 h-8 w-8 border-b-4 border-l-4 border-black bg-metric-yellow" />
            <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.1em] text-metric-yellow">
              Realtime_vol
            </h2>
            <div className="flex h-32 items-end gap-1">
              {[40, 70, 50, 90, 60].map((height, index) => (
                <div
                  key={index}
                  className="w-full bg-metric-green-bright transition-all duration-500 hover:h-[95%]"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="surface flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-3xl font-black uppercase leading-none">
                Top analyst picks
              </h2>
              <p className="mt-1 font-mono text-xs font-medium uppercase tracking-[0.1em] text-metric-muted">
                Updated 15 mins ago
              </p>
            </div>
            <div className="border-2 border-black bg-black px-2 py-1 font-mono text-xs font-bold uppercase text-metric-yellow">
              Live
            </div>
          </div>
          <div className="grid gap-1">
            {[
              ["01", "TATAMOTORS", "▲ 2.45%", "text-metric-green"],
              ["02", "BHARTIARTL", "▲ 1.12%", "text-metric-green"],
              ["03", "ZOMATO", "▼ 0.84%", "text-metric-red"],
            ].map(([rank, ticker, change, color]) => (
              <div
                key={ticker}
                className="flex justify-between border-2 border-black p-2 font-mono text-sm font-bold transition hover:bg-metric-yellow"
              >
                <span>
                  {rank} {ticker}
                </span>
                <span className={color}>{change}</span>
              </div>
            ))}
          </div>
        </section>
      </section>
      <FooterBar />
    </main>
  );
}
