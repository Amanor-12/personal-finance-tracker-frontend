# Personal Finance Tracker

This repository is now the single source of truth for the product. The React frontend lives in `frontend/`, the Node/Express API lives in `backend/`, and Render can deploy the whole app from this one repo.

## Structure

```text
personal-finance-tracker/
  backend/
    src/
    schema.sql
    .env.example
  frontend/
    src/
    public/
    tests/
    package.json
  shared/
    contracts/
  render.yaml
```

## Local Setup

```bash
npm --prefix backend install
npm --prefix frontend install
cp backend/.env.example backend/.env
npm run build
npm start
```

For local frontend development with Vite:

```bash
npm run dev:frontend
npm run dev:backend
```

## Production Deploy

Render should deploy this repo as one Node web service using `render.yaml`.

- Build command: `npm --prefix backend install && npm --prefix frontend install && npm run build`
- Start command: `npm start`
- Health check: `/api/health`

Set these environment variables on Render:

- `APP_BASE_URL` = the public Render URL for this app
- `ALLOWED_ORIGINS` = same public origin, or leave aligned with `APP_BASE_URL`
- `DATABASE_URL`
- `JWT_SECRET`
- `COOKIE_DOMAIN` only if you are using a custom shared domain

## Verification

```bash
npm run lint
npm run build
npm --prefix backend run verify
npm run test:e2e
```
