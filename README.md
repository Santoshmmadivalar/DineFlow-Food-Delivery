# DineFlow

Food delivery app. UI based on the free Bistro template by Shadcn Studio (shadcn/ui, Next.js, Tailwind v4), with Foodify's ordering features.

- `frontend/`  Next.js website: menu, cart, checkout, order tracking, receipts, light/dark theme
- `backend/`   Express + MongoDB API: users, cart, menu, orders, payments, receipt emails
- `admin/`     Vite + React admin portal: menu CRUD, live order board, order log, email receipts

## Run locally

1. Backend
   ```
   cd backend && cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
   npm install && npm run seed && npm run server
   ```
2. Website
   ```
   cd frontend && cp .env.example .env.local
   npm install && npm run dev              # http://localhost:3000
   ```
3. Admin portal
   ```
   cd admin && npm install && npm run dev
   ```

The website shows the bundled menu if the backend is offline. Without payment keys only cash on delivery is offered, and without SMTP settings no emails are sent.

Designed and developed by Santosh M Madivalar.

## Features

**Shopping cart**
- Filter the menu by one or more dish categories at once, by veg or non-veg, by a minimum and maximum price, and by dishes you have liked (tap the heart on a dish). You can also search by name and sort by price or name.
- Cart with quantity controls, a special-instructions note per dish (for example "less spicy"), and coupon codes `WELCOME10`, `FLAT50`, `FREEDEL` (edit them in `backend/config/coupons.js`).
- Prices are in rupees. Delivery is ₹40, free from ₹599. The server recalculates every total from the database, so prices and discounts can't be changed from the browser.

**Payments** (each option appears only when its keys are set in `backend/.env`)
- Cash on delivery.
- Razorpay (UPI, cards, wallets, net banking): the payment signature is verified on the server before an order counts as paid.
- Stripe card checkout: the payment is confirmed with Stripe on the server before an order counts as paid.
- Cancelled or failed online payments leave no unpaid order behind.

**Automatic receipt emails**
- An HTML receipt (items, notes, totals, discount, payment ID, delivery address) is emailed to the address entered at checkout as soon as an online payment succeeds, and when a cash order is marked Delivered.
- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `backend/.env`. For Gmail use `smtp.gmail.com`, port `465` and a 16-character app password.
- Customers can open their receipt under My orders. Admins can view it and email it again.

**Admin portal** (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`)
- Dashboard: paid revenue, orders today, orders in progress, average order, cash to collect, a revenue-per-day chart (7, 14 or 30 days), top dishes, orders by status and payment method, and recent orders. It refreshes on its own.
- Menu: add, edit (including changing the photo and marking a dish veg or non-veg), search, filter and delete dishes.
- Orders: live board that refreshes every 10 seconds, totals for orders, today, in progress and paid revenue, search and status filters.
- Dispatch: change an order's status with one click (Food Processing, Out for delivery, Delivered). Each change is saved in a status log with its time, and customers see it on a progress tracker.
- Every admin action is checked on the server and rejected without an admin login.

## Testing
`backend/tests/e2e.mjs` is an end-to-end test of the real API (sign up and login, cart, orders, Razorpay signature checks, receipt emails, admin protection, menu add / edit / delete). Run it with `npm run test:e2e` against a throwaway database; the file's first lines list what it needs. Stripe and Razorpay's own servers are not called by the test, so try both with their test keys before going live.

## Before deploying
- Set a strong `JWT_SECRET`, your own `MONGODB_URI`, and a strong admin password. The original Foodify repo had a live database password committed in `db.js`; it was removed here, so treat that password as compromised.
- Test with Razorpay and Stripe test keys first, then switch to live keys.
- Set `FRONTEND_URL` on the backend to your deployed website address (used for Stripe redirects).
- Change the placeholder domain in `frontend/src/app/robots.txt`.
