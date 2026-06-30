# chosen-pastor-ui

The Six Seeds staff dashboard — a Next.js app where pastors, staff, and
super admins manage their church's sermons, garden content, member account
deletions, and (for super admins) the fetch fleet and cross-church admin
tools. Talks to **Supabase** (auth + Postgres via PostgREST) and **ragserv**
(the AI/upload pipeline backend).

## Local development

### Prerequisites

- Node 22+
- A running [Supabase CLI](https://supabase.com/docs/guides/cli) stack
  (`supabase start`) for local auth + Postgres
- ragserv running locally (see that repo), or point `NEXT_PUBLIC_RAGSERV_URL`
  at a deployed environment

### Setup

```bash
npm install
cp .env.example .env.local   # defaults already match the local Supabase CLI stack
npm run dev
```

App runs at `http://localhost:3000`.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (`next build`) |
| `npm start` | Run a production build locally |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check (also run in CI as `lint-typecheck`) |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:ui` | Vitest with the browser UI |

Run both `npx tsc --noEmit` and `npm test` before pushing — CI runs them
as separate `lint-typecheck` and `unit-tests` checks, and a broken
typecheck won't always surface as a failing test.

### Environment variables

See `.env.example` for the full list with explanations. The defaults match
the local Supabase CLI stack, so a fresh clone needs no edits to run
locally — `NEXT_PUBLIC_AWS_THUMBNAILS_BUCKET_URL` and `SESSION_SECRET` are
the two most likely to need a real value depending on what you're testing.

## Deploying

The dashboard runs as a container on AWS Fargate behind
`https://admin.sixseeds.org`. Deploys are a single script:

```bash
./scripts/deploy-admin.sh
```

This builds the Docker image from your current working tree, pushes it to
ECR, rolls the ECS service, and verifies the new image is actually running.
Full details — prerequisites, environment variable overrides, required AWS
permissions, and troubleshooting — are in **[scripts/README.md](scripts/README.md)**.

Be on an up-to-date, clean `main` checkout before running it — the script
ships whatever is in your working tree, not what's on GitHub.

## Architecture notes

- **Auth**: Supabase session tokens are stored server-side in an `httpOnly`
  cookie (`lib/session.ts`), never exposed to the client. `proxy.ts` (Next's
  middleware-equivalent — see below) refreshes the access token transparently
  before it expires.
- **`proxy.ts` not `middleware.ts`**: Next.js 16 renamed the middleware file
  convention to `proxy.ts` and hard-errors the build if both files exist. If
  you're used to older Next.js projects, don't reintroduce a `middleware.ts`.
- **Two backends**: most reads go straight to PostgREST (`lib/api/client.ts`)
  with RLS scoping the data to the caller's church; writes that need
  privileged logic (account deletion, fetch fleet control, the AI pipeline)
  go through ragserv or a Supabase Edge Function instead.
- **`getSession()` vs `verifySession()` vs `requireAdmin()`** (`lib/session.ts`,
  `lib/dal.ts`): `getSession()` just reads the cookie; `verifySession()`
  additionally redirects unauthenticated/wrong-role users; `requireAdmin()`
  further restricts to `super_admin`. Use the narrowest one that fits.
