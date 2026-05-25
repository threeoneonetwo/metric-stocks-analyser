"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import facts from "@/data/facts.json";

type LoadingViewProps = {
  ticker: string;
};

export function LoadingView({ ticker }: LoadingViewProps) {
  const router = useRouter();
  const [factIndex, setFactIndex] = useState(0);
  const [progress, setProgress] = useState(8);
  const shuffledFacts = useMemo(() => [...facts].sort(() => 0.5 - Math.random()), []);

  useEffect(() => {
    const factTimer = window.setInterval(() => {
      setFactIndex((current) => (current + 1) % shuffledFacts.length);
    }, 4000);
    const progressTimer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 8, 100));
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
    <section className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-4xl flex-col justify-center px-4 py-16 sm:px-6">
      <div className="surface rounded-lg p-5 sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="mono-label">Generating report</p>
            <h1 className="mt-3 font-serif text-4xl leading-none sm:text-6xl">
              {ticker}
            </h1>
            <p className="mt-3 text-sm">Company name will resolve from market data.</p>
          </div>
          <span className="mt-1 h-2 w-2 rounded-full bg-metric-green motion-safe:animate-pulse" />
        </div>
        <div className="h-3 overflow-hidden rounded-full border border-black bg-white">
          <motion.div
            className="h-full bg-black"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="mt-8 min-h-24 border-t border-black pt-6">
          <p className="mono-label mb-3">Market fact</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={factIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              className="text-xl leading-8"
            >
              {shuffledFacts[factIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
        <Link href="/" className="mono-label mt-8 inline-block metric-link">
          Cancel
        </Link>
      </div>
    </section>
  );
}
