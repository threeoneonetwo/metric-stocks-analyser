"use client";

import { useEffect, useRef, useState } from "react";

export function HeroHeadline() {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const [pWidth, setPWidth] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      if (h1Ref.current) setPWidth(h1Ref.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (h1Ref.current) ro.observe(h1Ref.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", fontFamily: "Arial, sans-serif" }}>
      <h1
        ref={h1Ref}
        className="text-[2rem] sm:text-[2.75rem] font-bold text-white leading-[1.08] tracking-tight text-center"
        style={{ whiteSpace: "nowrap" }}
      >
        Finally know what<br />you&apos;re investing in
      </h1>
      <p
        className="text-[#8e909f] text-base leading-relaxed text-center"
        style={{ maxWidth: pWidth ? `${pWidth}px` : "100%" }}
      >
        Metric analyses 2,133 Indian stocks and explains what the data means in plain language.
      </p>
    </div>
  );
}
