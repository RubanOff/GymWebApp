# Gym Journal WebApp

Minimal mobile-first workout logger built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Supabase Postgres, and Recharts.

## Local setup

1. Create a Supabase project.
2. Run the SQL in [`supabase/schema.sql`](./supabase/schema.sql) in the Supabase SQL editor.
3. Create a `.env.local` file with the values below.
4. Install dependencies and start the app.

```bash
npm install
npm run dev
```

## Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is also supported if you prefer the newer naming.

## Notes

- Supabase Auth supports email/password and magic link in this app.
- The auth callback route is `/auth/callback`.
- The app uses `auth.users` for authentication and the tables in `supabase/schema.sql` for workout data.
- In development, empty dashboard/history/templates screens can show a `Load demo data` button that seeds example workouts and templates for the signed-in user.
- If you want sample content immediately, sign in and load demo data from the empty-state button on the dashboard.
