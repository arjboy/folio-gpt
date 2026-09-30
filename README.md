# The Chinese Wala — Restaurant OS

Responsive restaurant management application for The Chinese Wala.

## Stack
Next.js App Router, React, TypeScript, Supabase foundation, and Vercel deployment target.

## Current UI
- Dashboard with sales, order, item and net-collection KPIs
- Working POS ordering with search, categories, cart quantities and payment selection
- Order persistence in browser storage
- Menu management: add, edit, availability toggle and delete
- Chef management and attendance toggles
- Expense ledger with add, edit and delete
- Operations calendar
- Sales/reporting view with payment mix and CSV export
- Restaurant billing/profile settings
- Responsive desktop/tablet/mobile layout

## Data
The Supabase project contains the production database foundation for business settings, menu categories, dishes, chefs, orders, order items, attendance, expenses, chef advances, salary payouts, daily notes and activity logs. The current UI intentionally runs in local browser storage so the POS remains usable without a Supabase authentication session.

Environment variables for the eventual authenticated Supabase connection:
`NEXT_PUBLIC_SUPABASE_URL`
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Local setup
```bash
npm install
npm run dev
```

## Deployment
The repository is connected to Vercel. `vercel.json` uses the Next.js framework and `.next` output directory.
