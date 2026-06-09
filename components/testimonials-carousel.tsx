"use client";

import { useState, useRef } from "react";

const testimonials = [
  {
    quote: "I had been holding Zomato for months without really knowing why. Ran it on Metric and finally understood what I actually owned. Sent the link to three friends that same evening.",
    name: "Aditi R.",
    role: "Product Manager",
    location: "Bengaluru",
  },
  {
    quote: "I always found stock research intimidating. Metric broke it down so simply that I read the whole brief in one sitting. My whole team uses it now.",
    name: "Karan M.",
    role: "Growth Marketer",
    location: "Mumbai",
  },
  {
    quote: "Searched HDFC Bank before adding more. The brief was so clear I actually felt confident about the decision. Shared it with my flatmate who started investing the same week.",
    name: "Sneha P.",
    role: "UX Designer",
    location: "Pune",
  },
  {
    quote: "I used to spend an hour reading multiple sites before making any move. Now I just run Metric and I understand the stock in plain language within minutes.",
    name: "Rahul T.",
    role: "Software Engineer",
    location: "Hyderabad",
  },
  {
    quote: "Metric made me realise I had no real understanding of half my portfolio. Fixed that in an afternoon. Forwarded it to my whole college group chat.",
    name: "Nisha K.",
    role: "Content Strategist",
    location: "Delhi",
  },
];

export function TestimonialsCarousel() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const dirRef = useRef<"left" | "right">("right");

  const go = (next: number, dir: "left" | "right") => {
    dirRef.current = dir;
    setVisible(false);
    setTimeout(() => {
      setIndex(next);
      setVisible(true);
    }, 180);
  };

  const prev = () => go((index - 1 + testimonials.length) % testimonials.length, "left");
  const next = () => go((index + 1) % testimonials.length, "right");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", fontFamily: "Arial, sans-serif" }}>
      <p className="text-sm font-bold text-[#dbe2fd] text-center uppercase tracking-[0.2em]">
        Loved by everyone
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <button
          onClick={prev}
          aria-label="Previous testimonial"
          className="shrink-0 flex items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all"
          style={{ width: 34, height: 34 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8e909f]">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Stack all cards; card 0 (longest quote) is in-flow to set height for all */}
        <div className="flex-1" style={{ position: "relative" }}>
          {testimonials.map((t, i) => {
            const isActive = i === index;
            const cardStyle: React.CSSProperties = i === 0
              ? { position: "relative" }
              : { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

            return (
              <div
                key={i}
                className="dark-tile"
                style={{
                  ...cardStyle,
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                  opacity: isActive ? (visible ? 1 : 0) : 0,
                  pointerEvents: isActive ? "auto" : "none",
                  transform: isActive
                    ? (visible ? "translateX(0)" : dirRef.current === "right" ? "translateX(12px)" : "translateX(-12px)")
                    : "none",
                  transition: isActive ? "opacity 0.18s ease, transform 0.18s ease" : "none",
                }}
              >
                <p className="text-[#dbe2fd] text-sm leading-relaxed font-normal">
                  {t.quote}
                </p>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{t.name}</p>
                  <p className="text-[#8e909f] text-xs mt-0.5">{t.role}, {t.location}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={next}
          aria-label="Next testimonial"
          className="shrink-0 flex items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all"
          style={{ width: 34, height: 34 }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8e909f]">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem" }}>
        {testimonials.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i, i > index ? "right" : "left")}
            aria-label={`Go to testimonial ${i + 1}`}
            className="rounded-full transition-all duration-200"
            style={{
              width: i === index ? 18 : 6,
              height: 6,
              background: i === index ? "#b8c4ff" : "rgba(255,255,255,0.15)",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}
