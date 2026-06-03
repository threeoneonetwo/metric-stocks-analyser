"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Mover = {
  ticker: string;
  companyName: string;
  price: number | null;
  changePercent: number;
  source: string;
  asOf: string | null;
};

const fallbackMovers: Mover[] = [
  { ticker: "TATAMOTORS", companyName: "Tata Motors", price: null, changePercent: 2.45, source: "fallback", asOf: null },
  { ticker: "BHARTIARTL", companyName: "Bharti Airtel", price: null, changePercent: 1.12, source: "fallback", asOf: null },
  { ticker: "ZOMATO", companyName: "Zomato", price: null, changePercent: -0.84, source: "fallback", asOf: null },
  { ticker: "RELIANCE", companyName: "Reliance Industries", price: null, changePercent: 0.78, source: "fallback", asOf: null },
  { ticker: "HDFCBANK", companyName: "HDFC Bank", price: null, changePercent: -0.66, source: "fallback", asOf: null },
  { ticker: "ICICIBANK", companyName: "ICICI Bank", price: null, changePercent: 0.61, source: "fallback", asOf: null },
  { ticker: "INFY", companyName: "Infosys", price: null, changePercent: -0.58, source: "fallback", asOf: null },
  { ticker: "TCS", companyName: "Tata Consultancy Services", price: null, changePercent: 0.51, source: "fallback", asOf: null },
  { ticker: "MARUTI", companyName: "Maruti Suzuki", price: null, changePercent: 0.49, source: "fallback", asOf: null },
  { ticker: "ITC", companyName: "ITC", price: null, changePercent: -0.42, source: "fallback", asOf: null },
];

export function DailyMovers() {
  const [movers, setMovers] = useState<Mover[]>(fallbackMovers);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMovers() {
      try {
        const response = await fetch("/api/movers", { signal: controller.signal });
        const payload = (await response.json()) as { movers?: Mover[] };
        if (payload.movers?.length) {
          setMovers(payload.movers);
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMovers(fallbackMovers);
        }
      }
    }

    void loadMovers();

    return () => controller.abort();
  }, []);

  return (
    <section className="animate-entrance delay-4 -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)]">
      <div className="mb-[18px] text-center">
        <h2
          className="text-[25px] leading-none text-black [text-shadow:0.45px_0_0_#000,-0.45px_0_0_#000]"
          style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif', fontWeight: 700 }}
        >
          Biggest movers of the day
        </h2>
      </div>

      <div className="overflow-hidden px-1 pb-3">
        <div className="mover-list-track flex w-max gap-3">
          {[...movers, ...movers].map((mover, index) => (
            <MoverCard key={`${mover.ticker}-${index}`} mover={mover} rank={(index % movers.length) + 1} />
          ))}
        </div>
      </div>

    </section>
  );
}

function MoverCard({ mover, rank }: { mover: Mover; rank: number }) {
  const isUp = mover.changePercent >= 0;
  const shortName = cleanCompanyName(mover.companyName);

  return (
    <Link
      href={`/analyze/${encodeURIComponent(mover.ticker)}`}
      className="neo-press relative block min-h-[174px] w-[138px] shrink-0 snap-start border-4 border-black bg-white p-2.5 text-black neo-shadow-sm"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-mono text-[9px] font-black uppercase leading-3 tracking-[0.03em] text-black">
          {rank.toString().padStart(2, "0")}
        </p>
        <p className={`font-mono text-[10px] font-black leading-3 ${isUp ? "text-metric-green" : "text-metric-red"}`}>
          {isUp ? "▲" : "▼"} {Math.abs(mover.changePercent).toFixed(2)}%
        </p>
      </div>

      <p className="font-mono text-[12px] font-black uppercase leading-4 tracking-[0.01em] text-black">
        {mover.ticker}
      </p>
      <p className="line-clamp-2 min-h-8 text-[10px] font-bold uppercase leading-4 tracking-[0.01em] text-metric-muted">
        {shortName}
      </p>
      <p className="mb-2 mt-1 font-mono text-[9px] font-black uppercase leading-3 text-black">
        {formatPrice(mover.price)}
      </p>

      <div className="overflow-hidden border-2 border-black bg-metric-finance-bg">
        <MiniChart isUp={isUp} seed={rank} />
      </div>
    </Link>
  );
}

function MiniChart({ isUp, seed }: { isUp: boolean; seed: number }) {
  const points = buildPoints(isUp, seed);
  const area = `${points} 140,58 0,58`;

  return (
    <svg aria-hidden="true" className="h-14 w-[140px] shrink-0" viewBox="0 0 140 58">
      <polygon points={area} fill={isUp ? "rgba(79,143,198,0.18)" : "rgba(186,26,26,0.15)"} />
      <polyline points={points} fill="none" stroke={isUp ? "var(--metric-green)" : "var(--metric-red)"} strokeLinecap="square" strokeLinejoin="miter" strokeWidth="3" />
    </svg>
  );
}

function buildPoints(isUp: boolean, seed: number) {
  const values = Array.from({ length: 8 }, (_, index) => {
    const slope = isUp ? index * 3.2 : 22 - index * 2.2;
    const wave = Math.sin((index + seed) * 1.4) * 7;
    return Math.max(8, Math.min(50, 38 - slope + wave));
  });

  return values.map((value, index) => `${index * 20},${value.toFixed(1)}`).join(" ");
}

function cleanCompanyName(name: string) {
  return name.replace(/\b(limited|ltd\.?|company)\b/gi, "").replace(/\s+/g, " ").trim();
}

function formatPrice(price: number | null) {
  if (price === null) {
    return "PRICE N/A";
  }

  return `₹${price.toLocaleString("en-IN", {
    maximumFractionDigits: price >= 100 ? 0 : 2,
  })}`;
}
