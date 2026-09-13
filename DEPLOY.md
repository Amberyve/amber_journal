# Putting this on a real domain

Total time: about an hour the first time. Everything below has a free tier that
comfortably covers a few thousand journal users.

You need three things: a **Supabase** project (accounts + database), a **host**
(serves the site), and a **domain**.

---

## 1. Create the database (15 minutes)

1. Go to supabase.com and sign up. Create a new project.
   - Region: **Southeast Asia (Singapore)** — closest to the Philippines, so the
     app feels faster for your readers.
   - Set a database password and save it somewhere. You won't need it often, but
     you can't recover it.
2. Wait for the project to finish provisioning (about two minutes).
3. Open **SQL Editor → New query**. Paste the entire contents of
   `supabase/schema.sql` and press Run. It should say "Success. No rows returned."
4. Open **Table Editor**. You should now see `profiles`, `entries`, and
   `weekly_intentions`.

### Check the security is on

Still in Table Editor, each of those three tables should show an **RLS enabled**
badge. If any table says RLS is disabled, stop and re-run the schema — without
it, anyone could read everyone's journal entries.

---

## 2. Get your two keys

**Project Settings → API**. Copy:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY`

Both are meant to be visible in the browser. The security comes from the Row
Level Security policies in the schema, not from hiding these.

**Never** put the `service_role` key in this project. That one bypasses all
security. It belongs only on a server you control.

---

## 3. Run it on your own computer first

```bash
npm install
cp .env.example .env      # then paste your two values into .env
npm run dev
```

Open the address it prints (usually http://localhost:5173). Sign up with a real
email address, confirm it, and write a test entry. If that works locally, it will
work deployed.

---

## 4. Configure email and redirects

**Supabase → Authentication → URL Configuration**

- **Site URL**: your final domain, e.g. `https://journal.prettyamber.ph`
- **Redirect URLs**: add all of these, one per line:
  ```
  http://localhost:5173/**
  https://your-domain.com/**
  ```

Without this, confirmation and password-reset links will bounce.

**Authentication → Providers → Email**: leave "Confirm email" on. It stops people
signing up with addresses they don't own.

> Supabase's built-in email sender is rate-limited to a handful of messages per
> hour — fine for testing, not for a launch. Before you promote the app, go to
> **Project Settings → Authentication → SMTP Settings** and connect a real sender
> (Resend, Brevo and Mailgun all have free tiers). If you skip this, some
> sign-ups will silently never receive their confirmation email.

---

## 5. Deploy (10 minutes)

### Option A — Vercel (simplest)

1. Push this folder to a GitHub repository.
2. vercel.com → Add New → Project → import that repo.
3. Vercel detects Vite automatically. Before deploying, open
   **Environment Variables** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. You'll get a `something.vercel.app` address immediately.

`vercel.json` is already in the project, so page routes and caching work without
further setup.

### Option B — Netlify

Same flow at netlify.com. `netlify.toml` is already configured. Add the two
environment variables under **Site configuration → Environment variables**.

### Option C — Cloudflare Pages

Build command `npm run build`, output directory `dist`. `public/_redirects`
handles routing. Add the two environment variables in the dashboard.

> Environment variables are baked in at **build** time. If you add or change one,
> you must redeploy — refreshing the page won't pick it up.

---

## 6. Point your domain

Buy the domain wherever you like. Namecheap, Cloudflare and Porkbun are all
reasonable; a `.ph` domain goes through dot.ph and costs more.

**On Vercel**: Project → Settings → Domains → add your domain. Vercel shows the
exact DNS records to create.

**At your registrar**, add what it showed you — usually:

| Type  | Name | Value                |
|-------|------|----------------------|
| A     | @    | 76.76.21.21          |
| CNAME | www  | cname.vercel-dns.com |

DNS takes anywhere from ten minutes to a few hours. HTTPS is issued
automatically once it resolves.

**Then go back to step 4** and update the Site URL and Redirect URLs to your real
domain. This is the step people forget, and it breaks sign-up emails.

---

## 7. Before you tell anyone about it

- [ ] Sign up with a fresh email on the live domain, end to end
- [ ] Confirmation email arrives (check spam)
- [ ] Password reset works
- [ ] Write an entry, sign out, sign back in — the entry is still there
- [ ] Open it on a phone; check the bottom nav and the writing area
- [ ] Create a second account and confirm it cannot see the first one's entries
- [ ] Custom SMTP connected, not the built-in test sender

That second-to-last check is the important one. Do it once, properly.

---

## Costs at a glance

| Item | Free tier | When you'd pay |
|---|---|---|
| Supabase | 500 MB database, 50k monthly active users | Roughly never, for a journal |
| Vercel / Netlify | 100 GB bandwidth | Roughly never |
| Domain | — | ₱600–1,200/year (.com), more for .ph |
| Email sending | ~3,000/month on free tiers | Past a few thousand signups |

Realistically: the domain is your only cost for a long time.

---

## Things worth knowing

**Supabase pauses free projects after a week of no activity.** It restarts on the
next request, but the first visitor waits a few seconds. Once you have real
users this stops happening.

**Back up.** Supabase → Database → Backups covers the paid tiers. On free, run
a periodic CSV export from the Table Editor, or upgrade before you have people
depending on it.

**Changing the prompts.** All twelve weeks and eighty-four prompts live in
`src/lib/journal.js`. Edit and redeploy. Keep 12 weeks of 7 prompts unless you
also change `TOTAL_DAYS`.

**Deleting an account.** Not exposed in the UI. Delete the user in Supabase →
Authentication → Users; the schema's cascade rules remove their entries with them.
