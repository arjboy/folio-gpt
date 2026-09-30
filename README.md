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

## Access
App-level login (username `admin`; only a hash of the credentials is in the code). There is no login for now. The app starts an anonymous Supabase session automatically (enable anonymous sign-ins under Authentication → Sign In / Providers), which satisfies the `authenticated` RLS policies. Add real owner login before sharing the URL widely.

## What is wired to Supabase
- **Dashboard**: today's sales, order count, items sold, cash/digital/credit split, expenses, advances, 7-day chart, recent orders, chef attendance — all computed from real records (India time).
- **Order history**: search, date/status filters, bill detail, reprint, settle credit bills, cancel with reason.
- **Orders (POS)**: dishes/categories from DB, quantity steppers, order type, discount, GST from Settings, payment method, saves `orders` + `order_items`, printable bill.
- **Menu**: add dishes/categories, edit price, mark sold out, remove.
- **Chefs**: add chefs, punch in/out, advances, monthly payable, pay salary (deducts advances).
- **Expenses**: add/delete, daily and monthly totals.
- **Calendar**: end-of-day closing checklist and notes (`daily_notes`).
- **Reports**: 7/14/30-day summary, best sellers, CSV export.
- **Settings**: business name, address, GST, bill footer, hours, JSON backup download.

Data auto-refreshes every 45 seconds. Direct links such as `/orders` or `/chefs` open the matching screen.
