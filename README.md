# Pargive

> Golf · Charity · Prizes — A subscription-driven platform combining golf score tracking, monthly draws, and charity fundraising.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Express.js + Node (ES Modules) |
| Database | Supabase (Postgres + Auth + RLS) |
| Payments | Stripe (subscriptions + webhooks) |
| Deployment | Vercel (frontend) + Railway/Render (backend) |

---

## Project Structure

```
pargive/
├── backend/
│   ├── config/
│   │   └── supabase.js          # Supabase admin + anon clients
│   └── src/
│       ├── index.js             # Express entry point
│       ├── middleware/
│       │   ├── auth.js          # JWT auth, admin, subscription guards
│       │   └── validate.js      # Zod request validation schemas
│       ├── routes/
│       │   ├── auth.js          # /api/auth
│       │   ├── scores.js        # /api/scores
│       │   ├── draws.js         # /api/draws
│       │   ├── charities.js     # /api/charities
│       │   ├── subscriptions.js # /api/subscriptions
│       │   └── admin.js         # /api/admin
│       ├── services/
│       │   ├── drawEngine.js    # Core draw logic, simulation, processing
│       │   └── stripeService.js # Checkout, portal, webhook handler
│       └── supabase-schema.sql  # Full DB schema — run once in Supabase
│
└── frontend/
    └── src/
        ├── App.jsx              # Router + providers
        ├── lib/
        │   ├── api.js           # Axios client + all API functions
        │   └── supabase.js      # Supabase client
        ├── hooks/
        │   └── useAuth.jsx      # Auth context, user/subscription state
        ├── components/
        │   ├── ui/index.jsx     # Button, Card, Badge, Input, etc.
        │   ├── layout/AppLayout.jsx  # Sidebar navigation shell
        │   └── Guards.jsx       # Route guards (auth, admin, subscription)
        └── pages/
            ├── Auth.jsx         # Login + Register
            ├── Pricing.jsx      # Pricing & checkout
            ├── dashboard/
            │   ├── Overview.jsx # Dashboard home
            │   ├── Scores.jsx   # Score entry + management
            │   ├── Draws.jsx    # Draw history + match results
            │   ├── Winnings.jsx # Winnings + proof upload
            │   ├── Charity.jsx  # Charity selection + contribution
            │   └── Settings.jsx # Profile + billing portal
            └── admin/
                ├── Overview.jsx     # Platform stats
                ├── Draws.jsx        # Draw management + simulation
                ├── Winners.jsx      # Winner verification + payment
                ├── Users.jsx        # User management
                ├── Charities.jsx    # Charity CRUD
                └── Subscriptions.jsx # Subscription viewer
```

---

## Setup Guide

### 1. Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the full contents of `backend/src/supabase-schema.sql`
3. Copy your project URL, anon key, and service role key from **Settings → API**
4. To create an admin user: sign up normally, then in Supabase SQL editor run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
   ```

### 2. Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. In test mode, create two products:
   - **Monthly** — recurring £9.99/month → copy Price ID
   - **Yearly** — recurring £89.99/year → copy Price ID
3. Set up a webhook pointing to `https://your-backend.com/api/subscriptions/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
     - `customer.subscription.updated`
4. Copy the webhook signing secret

### 3. Backend

```bash
cd backend
cp .env.example .env
# Fill in all values in .env
npm install
npm run dev       # Development (http://localhost:4000)
npm start         # Production
```

**Required env vars:**
```
PORT=4000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
JWT_SECRET=                    # any random 32+ char string
STRIPE_SECRET_KEY=             # sk_test_...
STRIPE_WEBHOOK_SECRET=         # whsec_...
STRIPE_MONTHLY_PRICE_ID=       # price_...
STRIPE_YEARLY_PRICE_ID=        # price_...
FRONTEND_URL=http://localhost:5173
```

### 4. Frontend

```bash
cd frontend
cp .env.example .env
# Fill in Supabase URL and anon key
npm install
npm run dev       # Development (http://localhost:5173)
npm run build     # Production build
```

**Required env vars:**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_URL=http://localhost:4000
```

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/me` | ✓ | Current user + subscription + charity |
| PUT | `/api/auth/profile` | ✓ | Update profile |

### Scores
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/scores` | ✓ sub | Get current user's 5 scores |
| POST | `/api/scores` | ✓ sub | Add a score |
| PUT | `/api/scores/:id` | ✓ sub | Update a score |
| DELETE | `/api/scores/:id` | ✓ sub | Delete a score |

### Draws
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/draws` | public | List published draws |
| GET | `/api/draws/latest` | ✓ | Latest draw + user's entry |
| GET | `/api/draws/my/entries` | ✓ | User's draw history |
| GET | `/api/draws/my/winnings` | ✓ | User's winnings |
| PUT | `/api/draws/winners/:id/proof` | ✓ | Upload proof URL |
| POST | `/api/draws/admin` | admin | Create draw |
| POST | `/api/draws/admin/simulate` | admin | Run simulation |
| POST | `/api/draws/admin/:id/generate` | admin | Generate winning numbers |
| POST | `/api/draws/admin/:id/publish` | admin | Publish draw |
| PUT | `/api/draws/admin/winners/:id/verify` | admin | Approve/reject winner |
| PUT | `/api/draws/admin/winners/:id/payment` | admin | Mark paid |

### Charities
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/charities` | public | List charities (with search/filter) |
| GET | `/api/charities/:slug` | public | Single charity detail |
| POST | `/api/charities/select` | ✓ | Select charity + set % |
| GET | `/api/charities/my/selection` | ✓ | User's active selection |
| POST | `/api/charities/admin` | admin | Create charity |
| PUT | `/api/charities/admin/:id` | admin | Update charity |
| DELETE | `/api/charities/admin/:id` | admin | Soft-delete charity |

### Subscriptions
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/subscriptions/checkout` | ✓ | Create Stripe checkout |
| POST | `/api/subscriptions/portal` | ✓ | Open billing portal |
| GET | `/api/subscriptions/status` | ✓ | Current subscription |
| POST | `/api/subscriptions/webhook` | Stripe | Stripe webhook handler |

### Admin
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/stats` | admin | Platform overview stats |
| GET | `/api/admin/users` | admin | Paginated user list |
| GET | `/api/admin/users/:id` | admin | User full detail |
| PUT | `/api/admin/users/:id` | admin | Update user (name, role) |
| GET | `/api/admin/winners` | admin | Winners list (with status filter) |

---

## Draw Logic

```
Monthly draw flow:
1. Admin creates draw (draw_month, draw_type)
2. Admin clicks "Generate numbers" → draws engine runs:
   - Random: 5 unique random numbers 1–45
   - Algorithmic: weighted by frequency of actual user scores
3. System snapshots all active subscriber scores → draw_entries
4. Matches calculated per user (3/4/5 numbers)
5. Winners created with prize_amount = pool_share / winner_count
6. Admin previews results in simulated state
7. Admin publishes → draw visible to all users
8. Winners upload proof → Admin verifies → Admin marks paid
9. If no 5-match → jackpot rolls to next month
```

## Prize Pool Breakdown

| Tier | Pool share | Rollover? |
|------|-----------|----------|
| 5-number match (jackpot) | 40% | ✓ Yes |
| 4-number match | 35% | ✗ No |
| 3-number match | 25% | ✗ No |

Pool is calculated as: `active_subscribers × (£9.99 × 80%)` + any jackpot rollover.
Prizes are split equally among all winners in the same tier.

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Deploy /frontend to new Vercel project
# Set environment variables in Vercel dashboard
```

### Backend → Railway or Render
```bash
# Point to /backend directory
# Set all .env variables in dashboard
# Start command: npm start
```

### Stripe Webhook (Production)
Update webhook URL in Stripe dashboard to your live backend URL:
`https://your-api.railway.app/api/subscriptions/webhook`

---

## Testing Checklist

- [ ] User signup & email verification
- [ ] Login / logout
- [ ] Subscribe monthly (Stripe test card: `4242 4242 4242 4242`)
- [ ] Subscribe yearly
- [ ] Add 5 scores — verify rolling window works
- [ ] Attempt duplicate date — should be rejected
- [ ] Select charity + adjust percentage
- [ ] Admin: create draw, generate numbers, view simulation
- [ ] Admin: publish draw
- [ ] User: check draw entry appears with correct match count
- [ ] User: upload proof for a win
- [ ] Admin: approve/reject proof
- [ ] Admin: mark payment as paid
- [ ] Admin: verify jackpot rolls over if no 5-match
- [ ] Subscription cancel flow via Stripe portal
- [ ] Webhook: simulate payment failure
- [ ] Mobile layout on all pages
