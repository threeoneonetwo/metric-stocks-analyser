import { FooterBar, TopBar } from "@/components/site-chrome";

export default function AboutPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <section className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="surface p-6">
          <span className="mb-4 inline-block bg-black px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-metric-yellow">
            About
          </span>
          <h1 className="text-4xl font-extrabold uppercase leading-none">
            Metric Finance
          </h1>
          <p className="mt-6 text-base leading-7">
            Metric Finance helps investors generate shareable equity research
            reports for NSE and BSE listed companies. The app is being built to
            combine AI analysis, cached reports, market context, financials,
            peer comparison, sentiment, and risk signals in one mobile-first
            report.
          </p>
        </div>

        <div className="surface p-6">
          <h2 className="text-2xl font-extrabold uppercase leading-none">
            Current status
          </h2>
          <p className="mt-4 text-base leading-7">
            The product now has a live interface, a connected Postgres
            database, and a report cache foundation. The next phase is wiring
            real AI generation and market data into the saved report flow.
          </p>
        </div>
      </section>
      <FooterBar />
    </main>
  );
}
