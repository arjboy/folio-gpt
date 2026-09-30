# The Chinese Wala — Restaurant OS

Responsive restaurant management application for The Chinese Wala.

## Stack
Next.js App Router, React, TypeScript, Supabase Postgres/Auth foundation, and Vercel deployment target.

## Database
The connected Supabase project now has tables for business settings, menu categories, dishes, chefs, orders, order items, attendance, expenses, chef advances, salary payouts, daily notes, and activity logs, with seeded categories, dishes, and an example chef.

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to connect the UI to live records.

## Local setup
```bash
npm install
npm run dev
```

## Included UI
Responsive owner dashboard, KPI cards, sales overview, recent orders, chef attendance, quick actions, POS ordering with category/search filters, cart totals and payment choices, plus responsive placeholders for Menu, Chefs, Expenses, Calendar, Reports and Settings.

The next implementation phase is wiring every management screen to Supabase CRUD/auth and completing receipt printing, exports, audit workflows and role permissions.