# Runbook: move the backend off Render free tier (issue #3)

Status of the code side: **done** — the connection pool is explicitly sized
(`typeorm-options.ts`, `DB_POOL_MAX`, default 10). What remains are the two
billing actions below, which require the Render/Neon account owner.

## Measured baseline (2026-09-01, free tier)

```
GET https://avvenire-api.onrender.com/api/health
attempt 1 (cold): 22.4 s   <- free instance was asleep
attempt 2 (warm): 0.13 s
```

A 22-second cold start sits inside a customer's checkout and inside Stripe's
webhook timeout budget. This is the abandoned-cart / delayed-fulfillment
failure the audit called out.

> Note: the probe returned HTTP 404 — the deployed build predates the
> `/api/health` endpoint (added in 58f85fb). Deploy latest `main` first; the
> verification steps below assume it.

## Step 1 — Render: upgrade the backend service (~$7/mo)

1. Render dashboard → the `avvenire-api` web service → **Settings →
   Instance Type**.
2. Pick **Starter ($7/mo)** — always-on, no idle spin-down. (Standard $25/mo
   only if CPU/RAM ever becomes the bottleneck; nothing today suggests it.)
3. While in settings, confirm **Health Check Path** is `/api/health` so
   deploys only cut over when the app (and its DB connection) is actually up.
4. Redeploy latest `main`.

## Step 2 — Neon: paid plan with backups + PITR (~$19/mo)

1. Neon console → project → **Billing** → upgrade to the **Launch** plan.
2. Confirm **point-in-time restore window** is set (Launch allows up to
   7 days; set it to 7).
3. No env changes needed: the connection string stays the same, and the pool
   (10 connections) fits far inside Neon's per-compute limit (112+ even on
   the smallest compute).

If you'd rather defer the Neon spend: free tier "works" but has a 6-hour
restore window and 100 CU-h/month — an always-on paid Render instance with
`idleTimeoutMillis: 30s` lets Neon scale to zero between requests, so CU
budget is probably fine, but the 6-hour recovery window is the real risk for
a store holding order data. Recommendation: pay.

## Step 3 — verify (10 minutes, no account access needed — ping me)

1. **Stays warm**: wait >20 min without traffic, then
   `curl -w '%{time_total}' https://avvenire-api.onrender.com/api/health` —
   expect a warm-class response (well under 1 s, no cold start).
2. **Webhook after idle**: Stripe dashboard → Webhooks → the endpoint →
   **Resend** a past `checkout.session.completed` after the idle period —
   expect 2xx in the delivery log with sub-second latency. (Redelivery is
   safe: the webhook is idempotent, replays are recorded-and-skipped.)
3. **Pool sanity**: Neon console → Monitoring → active connections while
   clicking through the shop — expect ≤10 from the backend.

## Already satisfied

- **Frontend on a static/CDN host (free)** — the frontend is on Vercel
  (see `docs/2026-06-11-neon-migration-design.md`); only the API lives on
  Render.
- **Pool sized for the plan** — `extra: { max: 10, idleTimeoutMillis: 30s,
  connectionTimeoutMillis: 10s, keepAlive: true }` in
  `backend/src/modules/database/typeorm-options.ts`; override with
  `DB_POOL_MAX` if the plan ever changes.

## Monthly cost after this runbook

Render Starter $7 + Neon Launch $19 ≈ **$26/mo**, within the ticket's
$18–47 envelope.
