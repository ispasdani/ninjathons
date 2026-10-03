# Ninjathons

Competitive coding platform: practice, live 1v1 and Territory matches, challenges and ninjathons. Plans and design live in [`docs/`](docs/README.md).

Stack: Next.js 16 · Clerk · Convex · Tailwind v4 + shadcn/ui · Judge0 runner (planned) · Stripe (planned).

Decisions made since the planning docs (usernames, Stripe, judging modes) are in [`docs/notes/decisions.md`](docs/notes/decisions.md).

## Run locally

```bash
npm install
npx convex dev   # in one terminal: syncs convex/ to your dev deployment
npm run dev      # in another: http://localhost:3000
```

`.env.local` needs `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. In the Convex dashboard, set `CLERK_JWT_ISSUER_DOMAIN` and `CLERK_WEBHOOK_SECRET`, and point a Clerk webhook (`user.created`, `user.updated`, `user.deleted`) at `<CONVEX_SITE_URL>/clerk`.

## Layout

| Path | What |
|---|---|
| `app/(marketing)` | Home, pricing, blog. Static. |
| `app/(public)` | Problem pages, profiles, leaderboards. Server-rendered for SEO. (Not started.) |
| `app/(app)` | Dashboard, duels, solving, courses, settings. Signed-in only. |
| `app/(auth)` | Clerk sign-in and sign-up. |
| `convex/lib/functions.ts` | The guardrail wrappers. Every public Convex function is built from these. |
| `components/ui` | shadcn components, restyled to `docs/notes/design.md`. |

## The guardrail

Every check happens in Convex, before data leaves the server. `proxy.ts` only redirects signed-out visitors; it is never the thing protecting data.

- Public functions use `publicQuery`, `userQuery`, `userMutation`, `proQuery` or `proMutation`. ESLint blocks raw `query`, `mutation` and `action` outside `convex/lib`.
- Only the payment webhook writes `entitlements`.
- Each Pro function should get a test that calls it as a free user and expects `PRO_REQUIRED`.
