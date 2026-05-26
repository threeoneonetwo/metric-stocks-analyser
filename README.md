# Metric Stocks Analyser

Metric Finance generates AI-powered equity research reports for NSE and BSE listed stocks. Enter any ticker and get a shareable analysis covering executive summary, contrarian signal, financials, peer comparison, sentiment, and risks.

Built on Next.js 15, Gemini 2.5, and Postgres, with streaming generation and sub-second cached reads.

## Tech Stack

- Next.js 15
- React 19
- Gemini 2.5 via AI SDK
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

Set `GOOGLE_GENERATIVE_AI_API_KEY` to enable Gemini-backed report generation.
The default model is `gemini-2.5-flash`, configurable with `GEMINI_MODEL`.

When the key is unavailable, the app safely falls back to the mock report
payload. Saved reports are reused for 24 hours unless a request includes
`?refresh=1`.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run db:generate
npm run db:migrate
```
