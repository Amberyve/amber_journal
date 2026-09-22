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

- **Site URL**: your final domain, e.g. `https://journal.amberjournal.ph`
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
- [ ] Open it on a real phone — the bottom nav, the writing area, and typing
      into a field without the page zooming
- [ ] On the phone, use the browser's Share → Add to Home Screen, then open it
      from the home screen; it should fill the screen with no address bar
- [ ] Turn on airplane mode mid-entry and press save — it should say your writing
      is kept on the phone, and saving again with signal back should work
- [ ] Create a second account and confirm it cannot see the first one's entries
- [ ] Open a future day from the Pages grid — it should show a locked page with
      no writing fields, and the forward arrow should stop at today
- [ ] From a plain user account, type /admin into the address bar — it should
      bounce you back to the journal
- [ ] From the super admin account, confirm the console lists people and that no
      screen anywhere shows another person's written entries
- [ ] Custom SMTP connected, not the built-in test sender

That second-to-last check is the important one. Do it once, properly.

---

## Making yourself the super admin

The schema creates everyone as a plain `user`. After you've signed up on the live
site, run this once in the SQL editor with your own email:

```sql
update public.profiles set role = 'super_admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Sign out and back in, and a "Manage" link appears in the navigation. Give a second
account the `admin` role from there if you want a tester who can walk through
locked days without management access.

## Taking payments with GCash (PayMongo)

Readers get **30 days free**, then **₱250 for a year**. The renewal date is set
when the payment actually lands.

### 1. Get your PayMongo keys

1. Sign up at paymongo.com and complete business verification. Until you're
   verified you only get test keys, which is what you want at first anyway.
2. **Developers → API Keys**: copy the **secret key** (`sk_test_…` / `sk_live_…`).
   The public key is not used here.
3. **Developers → Payment Methods**: switch **GCash** on. Card, Maya and GrabPay
   are optional — the checkout offers whichever are enabled.

### 2. Deploy the two functions

The secret key must never reach the browser, so the payment calls run in Supabase
Edge Functions.

```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF

supabase secrets set \
  PAYMONGO_SECRET_KEY=sk_test_xxxxxxxx \
  SITE_URL=https://your-domain.com

supabase functions deploy create-checkout
supabase functions deploy paymongo-webhook --no-verify-jwt
```

`--no-verify-jwt` on the webhook is deliberate: PayMongo calls it, not a signed-in
person, so there's no JWT to check. It authenticates by signature instead.

### 3. Register the webhook

Your webhook URL is:

```
https://YOUR-PROJECT-REF.supabase.co/functions/v1/paymongo-webhook
```

Create it with the events you need:

```bash
curl https://api.paymongo.com/v1/webhooks \
  -u sk_test_xxxxxxxx: \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{
        "url":"https://YOUR-PROJECT-REF.supabase.co/functions/v1/paymongo-webhook",
        "events":["checkout_session.payment.paid","payment.paid"]}}}'
```

The response contains a **`secret_key` starting with `whsk_`**. That is the
webhook signing secret, and it is shown once. Save it:

```bash
supabase secrets set PAYMONGO_WEBHOOK_SECRET=whsk_xxxxxxxx
supabase functions deploy paymongo-webhook --no-verify-jwt   # redeploy to pick it up
```

### 4. Test before going live

With test keys, pay through the app. PayMongo's test GCash page has buttons to
simulate success and failure.

- [ ] Paying marks the account active and sets the renewal a year out
- [ ] `supabase functions logs paymongo-webhook` shows the paid line
- [ ] The `payments` table has one row
- [ ] Paying a second time does **not** add two years from today — it extends the
      existing end date by one year
- [ ] Posting a fake request to the webhook URL with no signature returns 401

That last check matters most. If an unsigned request is accepted, anyone can grant
themselves a subscription.

### 5. Switch to live

Swap `sk_test_` for `sk_live_`, create the webhook again with the live key (it
gives a different `whsk_`), set both secrets, and redeploy.

### What is NOT automatic

**GCash does not auto-charge on renewal.** PayMongo's recurring billing works for
cards, not for GCash e-wallet payments, so this is an annual one-off payment that
the reader makes again each year. The app records the end date, and the billing
screen shows it.

You will need to remind people before their year runs out — the console's People
tab shows every renewal date, filter by "Needs attention". Sending that reminder
automatically would need a scheduled job, which is a separate piece of work.

**Refunds** are done in the PayMongo dashboard. Afterwards, set the person's
subscription by hand in the console, since the refund doesn't roll back access.

## Re-running the schema

`supabase/schema.sql` is safe to run again on an existing project — every policy
and function is written to replace itself. If you deployed before the day-locking
rules were added, re-run the whole file to pick them up.

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
