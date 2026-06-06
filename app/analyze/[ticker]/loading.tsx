export default function AnalyzeLoading() {
  return (
    <main className="flex min-h-screen flex-col bg-metric-finance-bg">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-center px-5">
        <section className="border-4 border-black bg-white p-5 neo-shadow">
          <p className="mb-4 text-[12px] font-extrabold uppercase tracking-[0.14em] text-metric-blue">
            Building brief
          </p>
          <h1 className="text-[34px] font-black leading-none tracking-[-0.03em] text-black">
            Analysing stock
          </h1>
          <p className="mt-4 text-[15px] leading-6 text-black">
            Pulling price, volume, peers, news, and AI context.
          </p>
          <div className="mt-6 h-4 overflow-hidden border-4 border-black bg-white">
            <div className="search-submit-loader h-full w-1/2 bg-metric-finance-accent" />
          </div>
        </section>
      </div>
    </main>
  );
}
