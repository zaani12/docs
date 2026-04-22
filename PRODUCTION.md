# Production Runbook

## Runtime requirements

Required environment variables:

- `NODE_ENV=production`
- `SHOPIFY_API_KEY`
- `SHOPIFY_API_SECRET`
- `SHOPIFY_APP_URL` (public HTTPS URL)
- `SHOPIFY_SCOPES`
- `DATABASE_URL`
- `DIRECT_URL`

Database URL guidance:

- `DATABASE_URL` can point to a pooled runtime connection.
- `DIRECT_URL` should preferably point to the direct Postgres host used by Prisma schema operations.
- If you use Supabase and your runtime supports IPv6, use the direct database endpoint for `DIRECT_URL`, typically `db.<project-ref>.supabase.co:5432`.
- If your runtime is IPv4-only, `DIRECT_URL` can use the Supabase session pooler on port `5432`.
- Do not use the Supabase transaction pooler on port `6543` for Prisma schema or migration operations.

Optional integrations (enabled only when configured):

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (+ optional `SUPABASE_BUCKET_NAME`)
- `RESEND_API_KEY` (workflow email sending)
- Optional: `RESEND_FROM` (default fallback sender)
- Optional legacy domain tooling: `AWS_REGION` (+ AWS credentials via IAM role/profile/env for SES domain operations)
- `QSTASH_CURRENT_SIGNING_KEY` (+ optional `QSTASH_NEXT_SIGNING_KEY`)
- `CRON_SECRET` (fallback scheduler auth)

## Build and run

```bash
npm ci
npm run build
npm run setup
npm run start
```

## Health endpoints

- `GET /health` -> liveness (`200`)
- `GET /ready` -> readiness (`200` when DB is reachable, otherwise `503`)

These endpoints are intentionally unauthenticated for infrastructure probes.

## Docker

Build image:

```bash
docker build -t opspilot:prod .
```

Run image:

```bash
docker run --rm -p 3000:3000 --env-file .env opspilot:prod
```

The image now includes a built-in Docker `HEALTHCHECK` that targets `/ready`.

## Startup migration toggle

If your runtime host cannot reach the database direct connection used by Prisma schema
operations, do not run migrations on container boot.

Set:

```bash
RUN_DB_SETUP_ON_STARTUP=false
```

Then run `npm run setup` separately from an environment that can reach `DIRECT_URL`
(for Supabase direct connections, that usually means IPv6 support or the Supabase IPv4 add-on).

If you cannot provide IPv6 reachability from the runtime, another option is to set
`DIRECT_URL` to the Supabase session pooler (`*.pooler.supabase.com:5432`) instead.

## Startup behavior

- Docker builds generate Prisma Client ahead of runtime startup.
- On boot, the app runs a DB URL preflight, then `prisma generate && prisma migrate deploy` (`npm run setup`) unless startup setup is disabled.
- Set `RUN_DB_SETUP_ON_STARTUP=false` to skip this step on boot and manage migrations separately.
- Supabase is initialized without network-heavy diagnostics on first request.
- Logging is enabled by default. Set `DISABLE_LOGS=true` only when you explicitly want reduced logs.
