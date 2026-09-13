# Sip. Smile. Shine.

A twelve-week guided journal for stress, gratitude and small beginnings.
The web version of the Pretty Amber print journal.

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
    Landing.jsx            signed-out home
    Auth.jsx               sign in, sign up, forgot password
    ResetPassword.jsx      lands here from the reset email
    Journal.jsx            app shell, tabs, first-run setup
    NotConfigured.jsx      shown when .env is missing
  components/
    DayView.jsx            one day's page
    PagesView.jsx          all 84 days as a grid
    PatternsView.jsx       stress chart and reads (lazy-loaded)
    BreatheView.jsx        4-7-8 breathing and 5-4-3-2-1 grounding
    AccountView.jsx        profile, export, sign out, reset
    ui.jsx                 ruled inputs
  lib/
    supabase.js            client
    journal.js             the 12 themes and 84 prompts — edit content here
    data.js                all database reads and writes
  styles.css               design tokens and every style
supabase/schema.sql        tables, RLS policies, triggers — run this first
```

## Editing the content

`src/lib/journal.js` holds everything a reader sees: week names, the Hiligaynon
words, quotes, reflections and all eighty-four prompts. Change them and redeploy.

## Design

Green is the app surface; cream appears only on the writing card, so a page reads
as paper set on a table. Inputs are ruled lines rather than boxes. The daily
prompt is the largest element on the screen — everything else stays quiet.

Fraunces for prompts and headings, Karla for interface text.

## A note on scope

This is a journaling and self-reflection tool, not a clinical one. The app says
so where it matters — on the patterns screen and the breathing screen — and
points people toward real support. Keep that language if you adapt this.
