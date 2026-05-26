"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import facts from "@/data/facts.json";

type LoadingViewProps = {
  ticker: string;
  companyName: string;
};

export function LoadingView({ ticker, companyName }: LoadingViewProps) {
  const router = useRouter();
  const [factIndex, setFactIndex] = useState(0);
  const [progress, setProgress] = useState(8);
  const shuffledFacts = useMemo(() => [...facts].sort(() => 0.5 - Math.random()), []);

  useEffect(() => {
    const factTimer = window.setInterval(() => {
      setFactIndex((current) => (current + 1) % shuffledFacts.length);
    }, 4500);
    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 6, 100));
    }, 650);
    const redirectTimer = window.setTimeout(() => {
      router.push(`/r/${ticker}`);
    }, 8500);

    return () => {
      window.clearInterval(factTimer);
      window.clearInterval(progressTimer);
      window.clearTimeout(redirectTimer);
    };
  }, [router, shuffledFacts.length, ticker]);

  return (
    <section className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-[42rem] flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-block border-2 border-black bg-black px-6 py-2 font-mono text-sm font-bold uppercase tracking-[0.05em] text-metric-finance-accent neo-shadow">
          Ticker: {ticker}
        </div>
        <h1 className="font-serif text-5xl font-black uppercase leading-[0.95]">
          {companyName}
        </h1>
      </div>

      <div className="mb-10">
        <div className="mb-2 flex items-end justify-between px-1">
          <span className="font-mono text-sm font-bold uppercase tracking-[0.08em]">
            Initializing data stream...
          </span>
          <span className="font-mono text-sm font-bold uppercase">
            Loading {progress}%
          </span>
        </div>
        <div className="h-12 w-full overflow-hidden border-4 border-black bg-white neo-shadow">
          <motion.div
            className="h-full border-r-4 border-black scan-fill"
            initial={{ width: "8%" }}
            animate={{ width: `${progress}%` }}
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="surface relative mb-10 flex min-h-40 items-center justify-center p-6 text-center">
        <div className="absolute -right-1 -top-1 h-8 w-8 border-b-4 border-l-4 border-black bg-metric-finance-accent" />
        <AnimatePresence mode="wait">
          <motion.p
            key={factIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28 }}
            className="font-sans text-base font-bold uppercase leading-tight"
          >
            {shuffledFacts[factIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="text-center">
        <Link
          href="/"
          className="neo-press inline-block border-4 border-black bg-white px-10 py-5 font-mono text-sm font-bold uppercase tracking-[0.05em] neo-shadow hover:bg-black hover:text-white"
        >
          Cancel request
        </Link>
      </div>
    </section>
  );
}
