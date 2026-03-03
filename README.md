# Retail Price Intelligence System

Track product prices across retailers and get email alerts when prices drop below your target. Built with Next.js 16, TypeScript, Tailwind CSS, Better Auth, Drizzle ORM, and PostgreSQL.

## Features

- **Price tracking** – Add product URLs and monitor price changes over time
- **Woolworths support** – Native API integration for woolworths.com.au and woolworths.co.za (no scraping)
- **Multi-source fallback** – JSON-LD schema.org and HTML selectors for other retailers
- **Sale detection** – Shows Half Price, On Special, Save $X, and % off badges (only when savings are confirmed)
- **Price history** – View price trends with interactive charts
- **Email alerts** – Get notified when prices drop below a target price or by a percentage
- **Dark mode** – System-aware theme toggle
- **Target price alerts** – Set a target price or % drop threshold for notifications

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Auth:** Better Auth
- **Database:** PostgreSQL + Drizzle ORM
- **Styling:** Tailwind CSS v4
- **Email:** Resend
- **Charts:** Recharts

## Getting Started

### 1. Prerequisites

- Node.js 18+
- PostgreSQL database
- Resend account (for email alerts)

### 2. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth secret (generate with `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Base URL (e.g. `http://localhost:3000`) |
| `CRON_SECRET` | Optional secret for cron endpoint (Bearer token or `?secret=`) |
| `RESEND_API_KEY` | Resend API key for price drop emails |
| `RESEND_FROM_EMAIL` | Sender email for alerts (e.g. `Price Alerts <alerts@yourdomain.com>`) |

### 3. Database Setup

```bash
npm install
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
```

### 4. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

### 5. Price Check Cron (Optional)

To refresh prices periodically, call the cron endpoint:

```bash
# With secret in query
curl "https://your-domain.com/api/cron/check-prices?secret=YOUR_CRON_SECRET"

# Or with Bearer token
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/check-prices
```

Schedule this with a cron service (e.g. Vercel Cron, GitHub Actions) to run hourly or daily.

## How Price Fetching Works

1. **Woolworths** – Uses the product API for native JSON data. Sale status is set only when `savings > 0`. Uses `price.current` (total) and `price.was`; never uses per-unit `cupPrice`.
2. **Other retailers** – Fetches HTML, then tries JSON-LD schema.org Product data, then CSS selectors.
3. **Sale detection** – Products are marked on sale only when there is explicit evidence (savings amount or wasPrice > current price).

## Project Structure

```
src/
├── app/
│   ├── dashboard/           # Main dashboard, product list, add/delete
│   ├── dashboard/products/  # Product detail, price history, target price
│   ├── api/cron/            # Price check cron job
│   └── api/auth/            # Better Auth routes
├── components/              # UI components (SaleBadges, ThemeToggle, etc.)
├── lib/
│   ├── actions/             # Server actions (add-product, delete-product, etc.)
│   ├── auth.ts              # Better Auth config
│   ├── db/                  # Drizzle schema and connection
│   ├── services/            # Price fetcher (Woolworths, JSON-LD, selectors)
│   └── utils/               # formatPrice, etc.
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## License

Private project.
