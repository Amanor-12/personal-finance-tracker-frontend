# Rivo Frontend

Frontend application for the Rivo personal finance workspace.

## Demo

![Rivo landing page demo](./docs/demo/landing-page.png)

## Highlights

- public landing page for product positioning and plan discovery
- authenticated workspace for accounts, transactions, budgets, goals, recurring payments, reports, billing, and settings
- React Router navigation with protected routes
- Vite-based build and preview flow

## Local development

```bash
npm install
npm run dev
```

Set `VITE_API_URL` in `.env` when you want the frontend to talk to a local or deployed backend.

Optional production telemetry:

- `VITE_SENTRY_DSN`
- `VITE_SENTRY_ENVIRONMENT`
- `VITE_SENTRY_RELEASE`
- `VITE_SENTRY_TRACES_SAMPLE_RATE`

## Build

```bash
npm run build
npm run preview
```

## Quality gates

```bash
npm run lint
npm run check
npm run test:e2e
```
