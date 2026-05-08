# Backend API

Node.js + Express + PostgreSQL API for authenticated personal finance tracking.

## Stack

- Express
- PostgreSQL (`pg`)
- JWT authentication
- `bcrypt` password hashing
- `dotenv`
- CORS

## Architecture

```text
backend/src/
  config/       # env + database configuration
  controllers/  # request/response orchestration
  middleware/   # auth, validation, error handling
  routes/       # endpoint declarations
  services/     # business rules + SQL queries
  utils/        # reusable helpers
```

## Environment

Copy `backend/.env.example` to `backend/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/financial_tracker
JWT_SECRET=replace_with_a_long_secure_secret
AI_PROVIDER=heuristic
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
PASSWORD_RESET_TOKEN_TTL_MINUTES=30
EMAIL_VERIFICATION_TOKEN_TTL_HOURS=48
MFA_CHALLENGE_TTL_MINUTES=10
MFA_ENCRYPTION_SECRET=
MFA_ISSUER=Rivo
LOG_LEVEL=info
OBSERVABILITY_ALERT_WEBHOOK_URL=
SENTRY_DSN=
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=
SENTRY_TRACES_SAMPLE_RATE=1
EMAIL_PROVIDER=
EMAIL_FROM_ADDRESS=
RESEND_API_KEY=
BANK_TOKEN_ENCRYPTION_SECRET=
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox
PLAID_COUNTRY_CODES=US
PLAID_REDIRECT_URI=
PLAID_WEBHOOK_URL=
```

## Database Setup

1. Create the database:

```sql
CREATE DATABASE financial_tracker;
```

2. Import the schema:

```bash
psql "postgresql://postgres:postgres@localhost:5432/financial_tracker" -f schema.sql
```

3. Optional demo data:

```bash
npm run seed:demo
```

SQL demo seed for presentations:

```bash
psql "postgresql://postgres:postgres@localhost:5432/financial_tracker" -f demo_seed.sql
```

Seeded demo credentials:

- Email: `demo@flowledger.com`
- Password: `DemoPass123!`

## Local PostgreSQL Shortcuts

This repo already includes PostgreSQL binaries in `.local-postgres`.

Start the bundled local database:

```bash
npm run db:start-local
```

Reset the local database to schema + demo data:

```bash
npm run db:reset-demo
```

DBeaver connection settings for the bundled database:

- Host: `localhost`
- Port: `5432`
- Database: `financial_tracker`
- Username: `postgres`
- Password: `postgres`

## Run

```bash
npm install
npm run dev
```

## Verify

```bash
npm run verify
```

## Quality Gates

```bash
npm run lint
npm run contracts
npm run test
npm run check
```

## Routes

### Health

- `GET /api/health`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/login/mfa`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `GET /api/auth/mfa`
- `POST /api/auth/mfa/setup`
- `POST /api/auth/mfa/setup/confirm`
- `POST /api/auth/mfa/backup-codes/regenerate`
- `POST /api/auth/mfa/disable`
- `GET /api/auth/me`

### Frontend Handshake Compatibility

- `POST /users`
- `POST /users/register`
- `POST /users/login`
- `GET /users`
- `GET /users/me`

These routes mirror the Week 7 React fetch handout while staying user-safe:

- `POST /users` and `POST /users/register` create an account and return a JWT
- `POST /users/login` signs in and returns a JWT
- `GET /users/me` returns the signed-in user profile
- `GET /users` returns only the signed-in user as a one-item array for compatibility with list-based React examples

All other app data stays behind the same `Authorization: Bearer <token>` protection as the private `/api/*` routes.

### Categories

- `GET /api/categories`
- `GET /api/categories/:id`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

### Transactions

- `GET /api/transactions`
- `GET /api/transactions/:id`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`

### Budgets

- `GET /api/budgets`
- `GET /api/budgets/:id`
- `POST /api/budgets`
- `PUT /api/budgets/:id`
- `DELETE /api/budgets/:id`

### Dashboard

- `GET /api/dashboard/summary`

### AI

- `POST /api/ai/reports/summary`
- `POST /api/ai/transactions/suggestions`
- `POST /api/ai/goals/guidance`
- `GET /api/reports/forecast`

### Observability

- `POST /api/observability/frontend-errors`

Optional Sentry capture is enabled when `SENTRY_DSN` is configured. Request IDs remain the primary cross-system correlation key even without a vendor SDK.

### Accounts / Bank Sync

- `GET /api/accounts/bank-providers`
- `GET /api/accounts/bank-connections`
- `POST /api/accounts/bank-connections`
- `POST /api/accounts/bank-connections/plaid/link-token`
- `POST /api/accounts/bank-connections/plaid/exchange`
- `POST /api/accounts/bank-connections/:id/sync`
- `GET /api/accounts/reconciliation-queue`
- `POST /api/accounts/reconciliation-queue/:id/reconcile`

If `OPENAI_API_KEY` is configured, the backend uses the OpenAI Responses API with structured JSON output. Without a model key, the AI routes still work through the server-side heuristic engine so the product does not collapse into a 404 or blank premium state.

If `EMAIL_PROVIDER=resend`, `EMAIL_FROM_ADDRESS`, and `RESEND_API_KEY` are configured, password reset and email verification messages are delivered through Resend. Without an email provider in development, the backend returns preview links so the full trust flows can still be tested locally.

## Security Controls

- Passwords are stored only as `bcrypt` hashes
- Email verification links are single-use and expire automatically
- Password reset links are single-use and expire automatically
- TOTP-based MFA can be enabled with backup codes
- Security activity is recorded server-side for verified account actions
- Active sessions can be listed and revoked from the authenticated account settings
- Account deletion requires the current password and clears auth cookies on success
- JWT is required for all private routes
- Protected queries are user-scoped with `WHERE user_id = $1`
- Composite foreign keys enforce category ownership
- Validation middleware returns structured field errors
- Database uniqueness and check constraints backstop application rules
- Request IDs and structured JSON logs are emitted for API traffic
- Optional alert webhooks can be triggered for unhandled backend and fatal frontend errors
- Optional Sentry instrumentation can capture backend exceptions and browser-side React failures
- Plaid access tokens are encrypted at rest before they are stored in bank connection records

## Marker Workflow

1. Import `postman/Financial_Tracker_Postman_Collection.json`
2. Set `baseUrl` to `http://localhost:5000/api` or your deployed URL
3. Register or log in
4. Reuse the saved bearer token for protected routes
5. Run CRUD requests for categories, transactions, and budgets
6. Run `GET /dashboard/summary` to verify SQL aggregation

## Presentation Support

- SQL walkthrough: `backend/SQL_PRESENTATION_NOTES.md`
- Demo data script: `backend/demo_seed.sql`

## Render Deployment

1. Create a Render Web Service from this repository.
2. Set **Root Directory** to `backend`.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables:
   - `PORT`
   - `DATABASE_URL`
   - `JWT_SECRET`
6. Run `schema.sql` against the attached PostgreSQL database.
