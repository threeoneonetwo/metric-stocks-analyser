export function getMockReport(ticker: string) {
  return {
    ticker,
    companyName: ticker === "RELIANCE" ? "Reliance Industries Ltd" : `${ticker} Ltd`,
    price: "₹2,862.40",
    dayChange: "+1.34%",
    analyzedAt: "26 May 2026, 01:55 IST",
    verdict: "Mixed",
    sentiment: "Neutral",
    confidence: "64%",
    overview:
      "The company is presented here with placeholder fundamentals while the market data adapter is being wired. This page establishes the report structure, responsive layout, and visual system before connecting live NSE and BSE data.",
    summary:
      "Metric Finance is using a mocked report shell for the first setup step. The final report will ground every narrative paragraph in structured fundamentals, peer medians, and cited Indian business news. Treat the current values as layout fixtures only. The next implementation step is to replace these fixtures with typed adapter responses.",
    metrics: [
      ["Revenue TTM", "₹9.1T", "+4.8%", "₹1.2T"],
      ["Op Margin", "14.2%", "-80 bps", "18.6%"],
      ["P/E", "27.4x", "+2.1x", "24.8x"],
      ["ROE", "8.9%", "+40 bps", "12.1%"],
      ["D/E", "0.38x", "-0.04x", "0.42x"],
      ["3Y CAGR", "11.7%", "+160 bps", "9.3%"],
    ],
    peers: ["Target", "Peer A", "Peer B", "Peer C"],
  };
}
