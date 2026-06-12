"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

type BriefCardDeckProps = {
  paragraphs: string[];
  muted?: boolean;
  className?: string;
};

export function BriefCardDeck({ paragraphs, muted = false, className = "" }: BriefCardDeckProps) {
  const cards = useMemo(() => paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean), [paragraphs]);
  const [index, setIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const textColor = muted ? "text-[#c4c5d5]" : "text-[#dae2fd]";
  const canMove = cards.length > 1;
  const current = cards[Math.min(index, Math.max(0, cards.length - 1))] ?? "";

  function go(delta: number) {
    if (!cards.length) return;
    setIndex((value) => Math.min(cards.length - 1, Math.max(0, value + delta)));
  }

  function onTouchEnd(x: number) {
    if (touchStart === null) return;
    const distance = touchStart - x;
    setTouchStart(null);
    if (Math.abs(distance) < 38) return;
    go(distance > 0 ? 1 : -1);
  }

  if (!current) return null;

  return (
    <div className={`rounded-xl border border-white/10 bg-[#111a30]/70 ${className}`}>
      <div
        className="min-h-[10rem] px-4 py-4 sm:px-5 sm:py-5"
        onTouchStart={(event) => setTouchStart(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => onTouchEnd(event.changedTouches[0]?.clientX ?? 0)}
      >
        <p className={`text-sm leading-7 lg:text-[15px] lg:leading-8 ${textColor}`}>{current}</p>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 px-3 py-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canMove || index === 0}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0b1326] text-[#dae2fd] transition-colors hover:bg-[#b8c4ff] hover:text-[#0b1326] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[#0b1326] disabled:hover:text-[#dae2fd]"
          aria-label="Previous brief part"
        >
          <ChevronLeft size={18} strokeWidth={2.4} />
        </button>

        <div className="flex items-center gap-2">
          {cards.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              onClick={() => setIndex(dotIndex)}
              className={`h-2 rounded-full transition-all ${dotIndex === index ? "w-7 bg-[#b8c4ff]" : "w-2 bg-white/20 hover:bg-white/40"}`}
              aria-label={`Open brief part ${dotIndex + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8e909f]">
            {index + 1} / {cards.length}
          </span>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={!canMove || index === cards.length - 1}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0b1326] text-[#dae2fd] transition-colors hover:bg-[#b8c4ff] hover:text-[#0b1326] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-[#0b1326] disabled:hover:text-[#dae2fd]"
            aria-label="Next brief part"
          >
            <ChevronRight size={18} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
