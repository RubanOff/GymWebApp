# Gym Journal WebApp

Minimal mobile-first workout logger built with Next.js App Router, TypeScript, PostgreSQL, custom email/password auth, SMTP mail delivery, and Recharts.

## Git workflow

Use `main` only for production-ready code. Day-to-day work should happen in short-lived branches:

- `feature/...`
- `fix/...`
- `chore/...`

Open a pull request into `main`, let `CI` pass, then merge and let `Deploy` ship production automatically.

The detailed branch and PR flow lives in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Local setup

1. Create a PostgreSQL database.
2. Run the SQL in [`db/init.sql`](./db/init.sql).
3. Copy [`.env.example`](./.env.example) to `.env.local` and fill in the values.
4. Install dependencies and start the app.

```bash
cp .env.example .env.local
npm install
npm run dev
```

For environment preflight on a real machine or VPS:

```bash
npm run doctor
```

To create a verified local or staging user directly in PostgreSQL:

```bash
npm run create:user -- --email you@example.com --password secret123 --verified
```

To send a transport-level SMTP test email through the configured local mail server:

```bash
npm run mail:test -- --to you@example.com
```

## E2E smoke tests

1. Copy [`.env.e2e.example`](./.env.e2e.example) to `.env.e2e` and fill in a real test account.
2. Install the Playwright browser bundle.
3. Run the smoke suite against either local dev or the deployed site.

```bash
cp .env.e2e.example .env.e2e
npx playwright install chromium
set -a && source .env.e2e && set +a
npm run test:e2e
npm run test:e2e:write
```

## Environment variables

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/gympulse
APP_URL=http://localhost:3000
SESSION_COOKIE_NAME=gympulse_session
SESSION_SECRET=replace-with-a-long-random-secret
SMTP_HOST=127.0.0.1
SMTP_PORT=25
SMTP_FROM=noreply@gympulse.space
SMTP_ALLOW_SELF_SIGNED=true
```

## Notes

- Password auth, email verification, magic link login, and password reset are handled by the app itself.
- In production, set `APP_URL` to the canonical app origin, for example `https://gympulse.space`.
- Configure SMTP so the app can send verification, magic link, and password reset emails.
- For self-hosted mail on the VPS, configure Postfix for outbound delivery, then publish SPF, DKIM, DMARC, and reverse DNS for the server IP before relying on production email delivery.
- The app stores users, sessions, tokens, workouts, and templates in PostgreSQL.
- [`app/api/health/route.ts`](./app/api/health/route.ts) returns a simple app + database healthcheck payload.
- [`scripts/backup-postgres.sh`](./scripts/backup-postgres.sh) can be used from cron/systemd timers for nightly PostgreSQL backups.
- [`scripts/deploy.sh`](./scripts/deploy.sh) applies the DB bootstrap, builds the app, and restarts PM2 on the server.
- [`scripts/smoke-test.sh`](./scripts/smoke-test.sh) performs a small HTTP smoke test against the deployed app.
- [`scripts/doctor.mjs`](./scripts/doctor.mjs) validates env, PostgreSQL connectivity, SMTP connectivity, and `APP_URL`.
- [`scripts/create-user.mjs`](./scripts/create-user.mjs) creates a user directly in PostgreSQL for staging or smoke testing.
- [`scripts/send-test-email.mjs`](./scripts/send-test-email.mjs) sends a test message through the configured SMTP transport.
- [`scripts/run-e2e-write.sh`](./scripts/run-e2e-write.sh) runs only the write smoke with `E2E_ALLOW_WRITE=true`.
- [`scripts/finalize-prod.sh`](./scripts/finalize-prod.sh) installs the backup/doctor timers and enables PM2 startup under systemd.
- [`tests/e2e/auth-and-navigation.spec.ts`](./tests/e2e/auth-and-navigation.spec.ts) covers login redirect, auth UI, protected navigation, and an optional write smoke.
- [`ops/DEPLOY.md`](./ops/DEPLOY.md) and [`ops/MAIL.md`](./ops/MAIL.md) document VPS rollout, nginx, TLS, backup, and mail setup.
- In development, empty dashboard/history/templates screens can show a `Load demo data` button that seeds example workouts and templates for the signed-in user.
- If you want sample content immediately, sign in and load demo data from the empty-state button on the dashboard.
