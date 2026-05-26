import { FooterBar, TopBar } from "@/components/site-chrome";

export default function ContactPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <TopBar />
      <section className="mx-auto flex w-full max-w-[42rem] flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="surface p-6">
          <span className="mb-4 inline-block bg-black px-2 py-1 text-xs font-bold uppercase tracking-[0.08em] text-metric-yellow">
            Contact
          </span>
          <h1 className="text-4xl font-extrabold uppercase leading-none">
            Talk to Metric
          </h1>
          <p className="mt-6 text-base leading-7">
            For feedback, feature requests, or partnership conversations, reach
            out through the founder profile below.
          </p>
          <a
            href="https://www.linkedin.com/in/vansh-sharma-/"
            target="_blank"
            rel="noreferrer"
            className="neo-press mt-6 inline-flex w-full justify-center border-4 border-black bg-black px-8 py-4 text-sm font-extrabold uppercase tracking-[0.05em] text-white neo-shadow hover:bg-metric-green hover:text-white"
          >
            Contact on LinkedIn
          </a>
        </div>
      </section>
      <FooterBar />
    </main>
  );
}
