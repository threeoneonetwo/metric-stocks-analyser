# Metric Stocks Analyser

Metric Finance generates AI-powered equity research reports for NSE and BSE listed stocks. Enter any ticker and get a shareable analysis covering executive summary, contrarian signal, financials, peer comparison, sentiment, and risks.

Built on Next.js 15, Claude, and Postgres, with streaming generation and sub-second cached reads.

## Tech Stack

- Next.js 15
- React 19
- Claude via AI SDK
- Postgres with Drizzle ORM
- Tailwind CSS 4

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database

The app uses Postgres through Drizzle ORM. Set `DATABASE_URL` in `.env.local`
for local development and in Vercel project environment variables for
production.

Create or update the database tables:

```bash
npm run db:migrate
```

The first database-backed flow is report caching:

- `/analyze/[ticker]` creates or reuses a saved report record
- `/r/[ticker]` reads the saved report first
- `/api/reports/[ticker]` exposes the saved/generated report as JSON

## AI Reports

Set `ANTHROPIC_API_KEY` to enable Claude-backed report generation.
The default model is `claude-sonnet-4-6`, configurable with `CLAUDE_MODEL`.

When the key is unavailable, the app safely falls back to the mock report
payload. Saved reports are reused for 24 hours unless a request includes
`?refresh=1`.

## Market Data

The market-data layer supports Yahoo Finance for temporary MVP data and
OpenAlgo for broker-backed quotes.

Yahoo Finance does not require an API key:

```bash
MARKET_DATA_PROVIDER=yahoo
YAHOO_FINANCE_DEFAULT_EXCHANGE=NSE
```

The Yahoo adapter uses public search and chart endpoints. It can ground reports
with company name, exchange, last traded price, day change, OHLC, volume,
52-week range, sector, industry, and timestamp. Because Yahoo Finance is not a
licensed production API for this app, treat it as a short-term bridge.

OpenAlgo is self-hosted, so configure your own instance and API key:

```bash
MARKET_DATA_PROVIDER=openalgo
OPENALGO_BASE_URL=https://your-openalgo-domain
OPENALGO_API_KEY=your_openalgo_key
OPENALGO_DEFAULT_EXCHANGE=NSE
```

The adapter currently uses OpenAlgo symbol search and quotes. It can ground
reports with company name, exchange, last traded price, day change, OHLC, volume,
and timestamp. Fields OpenAlgo quotes do not provide, such as market cap,
sector, and financial statements, remain unavailable until we add another
fundamentals provider.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run db:generate
npm run db:migrate
```
