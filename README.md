# 🩺 MedPrep AI — Medical & Premed Study Toolkit

A full-stack web application for medical and premed students.  
**Frontend:** Next.js 15 + TypeScript + Tailwind CSS  
**Backend:** Node.js + Express + MongoDB  
**AI:** Anthropic Claude (claude-sonnet-4-20250514)  
**Payments:** Stripe (USD/cards) + Paystack (GHS/mobile money)

---

## 📁 Project Structure

```
medprep-app/
├── backend/               # Node.js + Express API
│   ├── server.js          # Entry point
│   ├── lib/
│   │   ├── db.js          # MongoDB connection
│   │   └── coursesData.js # Courses definition
│   ├── middleware/
│   │   └── auth.js        # JWT protect + requirePro
│   ├── models/
│   │   ├── User.js        # User schema (plan, prefs, stats)
│   │   └── Progress.js    # Study progress
│   └── routes/
│       ├── auth.js        # /api/auth (register, login, me)
│       ├── users.js       # /api/users (profile, password, export, delete)
│       ├── ai.js          # /api/ai (quiz, flashcards, lesson stream)
│       ├── billing.js     # /api/billing (Stripe + Paystack)
│       ├── courses.js     # /api/courses
│       └── settings.js    # /api/settings
│
└── frontend/              # Next.js 15 App Router
    ├── app/
    │   ├── layout.tsx     # Root layout + fonts
    │   ├── globals.css    # CSS vars + Tailwind
    │   ├── page.tsx       # Redirects to /courses
    │   ├── login/         # Auth pages
    │   ├── register/
    │   ├── courses/       # Course browser + [id] detail
    │   ├── quiz/          # Quiz generator
    │   ├── flashcards/    # Flashcard deck
    │   ├── lesson/        # Live lesson stream
    │   ├── billing/       # Stripe + Paystack checkout
    │   ├── settings/      # Profile, password, prefs, data, delete
    │   └── about/         # About MedPrep
    ├── components/
    │   ├── ui/            # Button, Card, Input, Badge, Spinner, Select
    │   └── layout/        # Sidebar, DashboardLayout
    └── lib/
        ├── api.ts         # Axios instance + interceptors
        ├── auth.ts        # Login, register, logout helpers
        ├── store.ts       # Zustand global state
        └── courses.ts     # 14 courses + quiz/flash limits
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)
- Gemini API key
- Stripe account
- Paystack account

### 1. Clone & install

```bash
git clone <your-repo>
cd medprep-app

# Backend
cd backend && cp .env.example .env
npm install

# Frontend
cd ../frontend && cp .env.local.example .env.local
npm install
```

### 2. Configure environment variables

**backend/.env**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/medprep
JWT_SECRET=your_super_secret_64_char_string_here
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.8-flash

# Stripe — get from dashboard.stripe.com
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...

# Paystack — get from dashboard.paystack.com
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

CLIENT_URL=http://localhost:3000
RESEND_API_KEY=re_...
EMAIL_FROM=MedPrep <notifications@your-verified-domain.com>
```

Email notifications are opt-in. Enabling them sends a confirmation message through Resend. Daily reminders require email notifications and are sent once per local day after 9 a.m. using the account timezone. Create an API key and verify the sender domain in Resend before setting `RESEND_API_KEY` and `EMAIL_FROM` in the backend environment. If email delivery is not configured, the preference is not saved.

AI quiz, flashcard, lesson, tutor, case, and Smart Review explanations use the Gemini API. Create a key in [Google AI Studio](https://aistudio.google.com/apikey), set `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in the backend environment, then restart the API. Keep the key server-side and restrict it to the Gemini API. Google states that prompts on its free tier may be used to improve its products; review the current [Gemini API terms](https://ai.google.dev/gemini-api/terms) before sending uploaded notes or other sensitive content.

**frontend/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Set up Stripe products

In your Stripe dashboard, create two recurring prices:
- **Pro Monthly** → $12/month → copy `price_xxx` → `STRIPE_PRO_MONTHLY_PRICE_ID`
- **Pro Annual** → $99/year → copy `price_xxx` → `STRIPE_PRO_ANNUAL_PRICE_ID`

Then run the Stripe webhook listener locally:
```bash
stripe listen --forward-to localhost:5000/api/billing/webhook/stripe
# Copy the whsec_... into STRIPE_WEBHOOK_SECRET
```

### 4. Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev
# → http://localhost:5000

# Terminal 2 — Frontend
cd frontend && npm run dev
# → http://localhost:3000
```

---

## 🐳 Docker (optional)

```bash
docker-compose up --build
```

---

## 💳 Payment Flow

### Stripe (USD)
1. User clicks "Upgrade via Stripe"
2. POST `/api/billing/stripe/checkout` → creates Stripe Checkout session
3. User redirected to Stripe-hosted checkout
4. On success, webhook `checkout.session.completed` fires
5. Backend updates user `plan` in MongoDB
6. User redirected back to `/billing?success=true`

### Paystack (GHS / Mobile Money)
1. User clicks "Upgrade via Paystack"
2. POST `/api/billing/paystack/initialize` → gets authorization_url
3. User redirected to Paystack-hosted checkout (card, mobile money, bank)
4. On success, Paystack redirects to `/billing?ps_success=true&reference=xxx`
5. Frontend calls POST `/api/billing/paystack/verify` with reference
6. Backend verifies with Paystack API → updates user plan

---

## 📊 Quiz & Flashcard Limits by Plan

| Plan    | Quiz questions | Flashcards |
|---------|---------------|------------|
| Free    | 10            | 15         |
| Pro     | 100           | 100        |
| Annual  | 150           | 150        |

---

## 🔐 API Endpoints

### Auth
| Method | Route                  | Auth | Description           |
|--------|------------------------|------|-----------------------|
| POST   | /api/auth/register     | —    | Register new user     |
| POST   | /api/auth/login        | —    | Login + get JWT       |
| GET    | /api/auth/me           | ✓    | Get current user      |

### Users
| Method | Route                  | Auth | Description           |
|--------|------------------------|------|-----------------------|
| PATCH  | /api/users/profile     | ✓    | Update profile        |
| PATCH  | /api/users/password    | ✓    | Change password       |
| PATCH  | /api/users/preferences | ✓    | Update preferences    |
| GET    | /api/users/export      | ✓    | Download data JSON    |
| DELETE | /api/users/account     | ✓    | Delete account        |

### AI
| Method | Route                  | Auth | Description           |
|--------|------------------------|------|-----------------------|
| POST   | /api/ai/quiz           | ✓    | Generate quiz         |
| POST   | /api/ai/flashcards     | ✓    | Generate flashcards   |
| POST   | /api/ai/lesson         | ✓    | Stream lesson (SSE)   |

### Billing
| Method | Route                         | Auth | Description              |
|--------|-------------------------------|------|--------------------------|
| POST   | /api/billing/stripe/checkout  | ✓    | Create Stripe session    |
| POST   | /api/billing/stripe/portal    | ✓    | Open billing portal      |
| POST   | /api/billing/webhook/stripe   | —    | Stripe webhook           |
| POST   | /api/billing/paystack/initialize | ✓ | Init Paystack payment  |
| POST   | /api/billing/paystack/verify  | ✓    | Verify Paystack payment  |
| GET    | /api/billing/status           | ✓    | Get billing status       |

---

## 🌐 Deployment

### Backend (Render / Railway / Heroku)
1. Push `backend/` to a repo
2. Set all env vars in the dashboard
3. Start command: `npm start`

### Frontend (Vercel — recommended)
1. Push `frontend/` to a repo
2. Connect to Vercel
3. Set `NEXT_PUBLIC_API_URL` to your backend URL
4. Deploy

### Database (MongoDB Atlas)
1. Create free cluster at cloud.mongodb.com
2. Get connection string → `MONGODB_URI`

---

## 📜 License
MIT — built for educational purposes.
