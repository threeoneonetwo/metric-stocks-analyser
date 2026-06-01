"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";

const faqItems = [
  {
    question: "What does Metric analyse?",
    answer:
      "Metric reads price action, volume, 52-week position, fundamentals, peer movement, news sentiment, and technical signals for NSE and BSE listed stocks.",
  },
  {
    question: "Does Metric tell me what to buy?",
    answer:
      "No. Metric explains what the data is saying before you make your own decision. It avoids buy, sell, hold, target price, and recommendation language.",
  },
  {
    question: "Where does the data come from?",
    answer:
      "The current build combines market data, Upstox fundamentals, Tradient and web news signals, and Gemini analysis to turn raw inputs into a readable brief.",
  },
  {
    question: "How fresh is the analysis?",
    answer:
      "Reports refresh from the latest available provider snapshots. Market data can move faster than fundamentals, so each report shows the relevant timestamp where available.",
  },
  {
    question: "Can I search by company name?",
    answer:
      "Yes. You can type a ticker or a company name. Metric tries to resolve the closest NSE/BSE listed match and shows matching stocks in the dropdown.",
  },
];

export function HomeFaq() {
  const [openIndex, setOpenIndex] = useState(-1);

  return (
    <section className="animate-entrance delay-4 surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[25px] font-black leading-none tracking-[-0.02em] text-black [text-shadow:0.45px_0_0_#000,-0.45px_0_0_#000]">
          Questions, answered
        </h2>
        <span className="border-2 border-black bg-metric-finance-accent-soft px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.08em] text-metric-blue">
          FAQ
        </span>
      </div>

      <div className="grid gap-2">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.question} className="overflow-hidden border-2 border-black bg-white">
              <button
                type="button"
                className="faq-trigger flex w-full items-center justify-between gap-4 px-3 py-3 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? -1 : index)}
              >
                <span className="font-mono text-sm font-black leading-5 tracking-[0.02em] text-black">
                  {item.question}
                </span>
                <span className="neo-press flex h-7 w-7 shrink-0 items-center justify-center border-2 border-black bg-metric-finance-accent-soft">
                  {isOpen ? <Minus size={16} strokeWidth={2.8} /> : <Plus size={16} strokeWidth={2.8} />}
                </span>
              </button>
              <div className={`faq-answer ${isOpen ? "faq-answer-open" : ""}`}>
                <p className="border-t-2 border-black px-3 pb-4 pt-3 text-sm font-medium leading-6 text-metric-muted">
                  {item.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
