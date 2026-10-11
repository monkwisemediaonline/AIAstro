# Go live: GitHub → Supabase → Vercel

The app runs locally without any accounts (dev mode stores data in `data/dev-store.json`).
Follow these steps once to put it online privately.

## 1. GitHub (private repo)
1. github.com/new → name `personal-jyotish-ai` → **Private** → no README → Create.
2. From this folder:
   ```bash
   git remote add origin https://github.com/<you>/personal-jyotish-ai.git
   git push -u origin main
   ```
   `private/`, `data/` and `.env*` are git-ignored — check `git status` before every push.

## 2. Supabase (new account/project)
1. Create a project (region **ap-south-1 Mumbai**). Save the database password in a password manager.
2. **Authentication → Sign In / Providers → Email**: keep Email enabled, **turn OFF "Allow new users to sign up"**.
3. **Authentication → Users → Add user → Create new user**: your email + a strong password, tick "Auto confirm".
4. **SQL Editor**: paste and run each file in `supabase/migrations/` in date order
   (`20261010000000_init.sql`, then `20261011000000_remedies.sql`). Run any new migration file
   added later the same way.
5. Make yourself the owner (SQL Editor):
   ```sql
   insert into public.app_owner (user_id)
   select id from auth.users where email = 'YOUR_EMAIL';
   ```
6. **Project Settings → API**: copy the Project URL and the **publishable** (or anon) key.
   Never use the service-role / secret key in this app.

Optional (CLI instead of SQL editor): `npx supabase login`, `npx supabase link --project-ref <ref>`,
`npx supabase db push`.

## 3. Local `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```
Restart `npm run dev` → you'll see the login page.

## 4. Vercel
1. vercel.com → Add New → Project → import the GitHub repo.
2. Environment variables (Production + Preview): the two values above.
3. Deploy. Every push to `main` redeploys.
4. Optional: Settings → Deployment Protection → Vercel Authentication for previews.

## Security model
- No public sign-up (disabled in Supabase) and no sign-up page in the app.
- Every table has Row Level Security: rows are visible only when `auth.uid()` is in `app_owner`
  **and** owns the row. The anon role has no grants.
- The proxy redirects signed-out visitors to `/login`; production without Supabase config returns 503.
- `noindex` headers + robots.txt; no analytics; no AI calls yet.
- Place search sends only the typed place name to Open-Meteo's geocoder (GeoNames data, CC-BY 4.0).

## Verify RLS (after setup)
In SQL Editor, as the anon role nothing should be visible:
```sql
set role anon; select count(*) from public.people; reset role;   -- expect: permission denied
```
