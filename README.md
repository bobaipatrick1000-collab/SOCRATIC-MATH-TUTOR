This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Topic Packs

Every topic page (`/topics/[slug]`) renders a five-block Topic Pack: **Description**, **Context**, **Objectives** (3–6), **Worked examples** (≥3), and **Practice** (≥8). Practice items open in the existing hint-ladder workspace (`/workspace/pk:<slug>:<id>?src=pack`) and only ever receive the *roots/hints* — never pre-solved `final_result`s.

- **Online mode** (set `AUREA_AI_API_KEY`): the LLM builds a pack grounded in live evidence retrieved from an allowlist of open sources (OpenStax, CK-12, MIT OCW, Gutenberg, LibreTexts, Khan Academy, arXiv, mit.edu) or an optional Tavily-style search proxy (`AUREA_SEARCH_API_KEY`/`AUREA_SEARCH_BASE_URL`). Citations are recorded per pack. Non-math queries are rejected (422).
- **Offline mode** (no key, or any upstream failure): a fallback pack is built from the internal curriculum spine (fixture lessons + catalog items + engine-safe twin templates), flagged `license_flags.fallback = true` and shown with a banner. No network is ever touched.
- **Guarding**: every pack is re-validated against the real math engine before it is stored. Items whose keys the engine cannot confirm are stripped (`guardPackKeys`). The API surfaces only the stripped public pack; hidden keys live server-side and are released solely through the workspace launcher endpoint.
- **Cache**: packs are persisted to SQLite (`topic_packs` table); `POST /api/topics/[id]/pack` rebuilds (and can re-fetch) a pack; cached packs use `source_hash` to detect staleness.

## Env vars

Offline operation needs none. Topic Packs use the variables in `.env.example` (copy it to `.env.local`); `AUREA_DATA_DIR`/`AUREA_DB_PATH` control SQLite location.

## Checks

```bash
npm run test:engine   # math verification engine
npm run test:pack     # Topic Pack acceptance (shapes, stripping, fallback, allowlist, cache)
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
