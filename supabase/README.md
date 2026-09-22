# Sip. Smile. Shine.

A twelve-week guided journal for stress, gratitude and small beginnings.
The web version of the Amber Journal print journal.

Accounts and entries are stored in Supabase. Each person can read and write only
their own rows, enforced in the database by Row Level Security.

## Quick start

```bash
npm install
cp .env.example .env    # paste your Supabase URL and anon key
npm run dev
```

Deployment, domain setup and the launch checklist are in **DEPLOY.md**.

## What's here

```
src/
  App.jsx                  routes and the auth gate
  pages/
    Landing.jsx            the cover, then the interior sections
    Auth.jsx               sign in, sign up, forgot password
    ResetPassword.jsx      lands here from the reset email
    Journal.jsx            app shell, tabs, first-run setup
    AdminRoute.jsx         guards /admin
    Admin.jsx              the management console
    NotConfigured.jsx      shown when .env is missing
  components/
    DayView.jsx            one day's page
    PagesView.jsx          all 84 days as a grid
    PatternsView.jsx       stress chart and reads (lazy-loaded)
    BreatheView.jsx        4-7-8 breathing and 5-4-3-2-1 grounding
    AccountView.jsx        profile, export, sign out, reset
    ui.jsx                 ruled inputs
    Cup.jsx                the cover's line-art cup, as scalable SVG
  lib/
    supabase.js            client
    journal.js             the 12 themes and 84 prompts — edit content here
    data.js                all database reads and writes
    admin.js               console reads and writes (all guarded in Postgres)
  styles.css               design tokens and every style
supabase/schema.sql        tables, RLS policies, triggers — run this first
```

## Editing the content

`src/lib/journal.js` holds everything a reader sees: week names, the Hiligaynon
words, quotes, reflections and all eighty-four prompts. Change them and redeploy.

The wording here matches the printed A5 journal exactly, so the two editions stay
in step. If you edit a prompt in one, change it in the other. Spelling follows
American usage throughout, as Philippine English does.

## Three levels of access

| Level | Their own journal | Locked days | Management |
|---|---|---|---|
| `user` | yes | locked until the day arrives | no |
| `admin` | yes | can open any day, for testing | no |
| `super_admin` | yes | can open any day | full console at `/admin` |

An admin exists so the whole twelve weeks can be walked through without waiting
twelve weeks. Whenever they're on a day that hasn't arrived, an amber bar says so,
so a test session is never mistaken for how the journal behaves for a reader.

**No level can read anyone else's entries.** There is deliberately no admin policy
on `public.entries`, and the console works from counts and dates only — days
written, last active, joined, plan. If you ever decide to change that, say so on
the sign-up page first; people writing about their stress have assumed otherwise.

Roles are held in `profiles.role`. A trigger blocks anyone from changing their own
role, so a user cannot promote themselves through the API. Only
`admin_set_role()`, which checks `is_super_admin()`, can change one.

### Making yourself the first super admin

Sign up through the app, then run this once in the Supabase SQL editor:

```sql
update public.profiles set role = 'super_admin'
where id = (select id from auth.users where email = 'you@example.com');
```

### Subscriptions

Thirty days free from signup, then ₱250 a year through PayMongo (GCash, and card,
Maya or GrabPay if you enable them).

Access is decided by `has_access()` in the database, which the write policies on
`entries` and `weekly_intentions` call. When it returns false the reader can still
read everything they wrote — only writing stops. Staff and lifetime accounts are
never gated.

The webhook is what grants access, never the redirect back from GCash: that
redirect is just a URL anyone could visit. `supabase/functions/paymongo-webhook`
verifies the signature, rejects anything older than five minutes, refuses
duplicate payment references, and calls `apply_payment()`, which extends from
whichever is later — today or the existing end date — so paying early never costs
anyone days.

Setup is in DEPLOY.md.

### Manual subscriptions

`public.subscriptions` holds one row per person: plan, status, amount in centavos,
renewal date, and which provider it came from. The console edits these by hand,
which is enough while you're selling through Facebook and GCash.

To charge automatically, connect PayMongo and have its webhook write to the same
table, setting `provider` and `provider_ref`. No app code needs to change.

## Days open on their own morning

Day 1 is the start date the reader chooses during setup (which cannot be in the
future). Every day after that opens on its own date — you can go back and fill in
a morning you missed, but you cannot write ahead.

This is enforced in two places. The interface disables the forward arrow at
today, shows future days as dashed in the grid, and renders a locked page instead
of the form. The database enforces it independently in the row-level policies via
`day_is_open()`, so it holds even if someone calls the API directly.

That function allows one extra day of slack. Postgres runs on UTC while readers
are in UTC+8, so at 7am in Iloilo the server still thinks it's yesterday; without
the slack, people would find their own day locked each morning. It still makes
writing weeks ahead impossible.

## How progress is measured

The twelve segments in the header are weeks. Each one fills by how many of that
week's seven days have something written in them — so the bar reflects what the
reader has actually done, not how much time has passed. A week left blank stays
blank however long ago it was.

The ringed segment, the week name in the greeting, and the "Week N of 12" label
all follow the day currently open, so the header can never contradict the page
below it.

## On phones

Most readers will open this on a phone, so a few things are deliberate:

- **Every text field is 16px.** Below that, iOS Safari zooms the page each time
  someone taps into a field. If you restyle inputs, keep 16px.
- **Add to Home Screen works.** `public/manifest.webmanifest` plus the icons make
  it installable; it then opens full-screen with no browser chrome. Requires
  HTTPS, so it works on the deployed site, not on `localhost` over plain HTTP.
- **Drafts survive interruption.** What someone types is written to the phone's
  local storage as they go, and cleared once the server confirms the save. A
  call, a crashed tab, or no signal won't lose the morning's entry.
- **Touch targets are at least 44x44.** Verified at 375px and 360px wide.
- **Safe areas are respected** — the bottom nav clears the iPhone home indicator.

Regenerate the icons with `python3 make_icons.py` if you change the mark.

## The landing page

The first screen reproduces the printed cover: cream paper, the double green and
amber rule, the line-art cup, and the three stacked words. Scrolling past it
moves onto the app's own dark green surface — cover, then interior, which is the
same metaphor the app uses (green table, cream paper).

The cup is `src/components/Cup.jsx`, drawn as SVG so it stays sharp at any size
and can be recoloured. It's used large on the cover, small in the footer band,
and again on the closing panel.

Fonts fall back to system sans and serif if Google Fonts is slow or blocked, so
the page never lands in Times.

## Type

All typography sits on one ladder, defined once at the top of `styles.css`. No
rule in the project sets a font size that isn't on it.

| Token | Size | Used for |
|---|---|---|
| `--t-micro` | 11px | tags, chips, chart axis labels |
| `--t-label` | 12px | field labels, fine print |
| `--t-small` | 13px | secondary and meta text |
| `--t-ui` | 14px | nav, chips, dense interface text |
| `--t-body` | 16px | body copy, every input, buttons |
| `--t-lead` | 18px | lead paragraphs, week quotes |
| `--t-h4` | 20px | small headings, week names |
| `--t-h3` | 23px | daily prompts, card headings |
| `--t-h2` | 28px | section headings |
| `--t-h1` | 36px | page titles |
| `--t-d1/d2/d3` | fluid | cover words, landing heads, closing line |

Sizes are in rem, so they follow the reader's own browser text setting. Line
heights are four tokens (`--lh-display`, `--lh-head`, `--lh-ui`, `--lh-body`) and
weights are two (`--w-normal`, `--w-bold`) — no 500s or 300s anywhere.

Two families only: `--serif` (Fraunces) for prompts, headings and numbers,
`--sans` (Karla) for everything else. Both have full fallback chains.

If you add a screen, use the tokens. A one-off `font-size: 15px` is how the
uniformity goes again.

## Design

Green is the app surface; cream appears only on the writing card, so a page reads
as paper set on a table. Inputs are ruled lines rather than boxes. The daily
prompt is the largest element on the screen — everything else stays quiet.

Fraunces for prompts and headings, Karla for interface text.

## A note on scope

This is a journaling and self-reflection tool, not a clinical one. The app says
so where it matters — on the patterns screen and the breathing screen — and
points people toward real support. Keep that language if you adapt this.
