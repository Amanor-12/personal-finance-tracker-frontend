# Personal Finance Tracker Frontend

This is the frontend for my personal finance tracker school project.

Right now I focused on building the frontend flow first while I finish the backend separately. The app starts on a login screen, then opens the dashboard after sign in. For now the login is temporary on the frontend, but the structure is there so I can connect the real backend later.

## What the app does

The idea of the app is to give the user one place to keep track of basic personal finance information.

At the moment, after login the user can:

- see overview cards on the dashboard
- update a savings counter
- save profile details
- look at recent activity
- see session and status information

## Main frontend features

- Dedicated login screen as the first page
- Temporary frontend login flow
- Demo login for presentation/testing
- Remembered email using local storage
- Protected dashboard after login
- Savings tracker with progress bar
- Profile form with validation
- Activity section
- Session/status panel

## Demo login

You can use this account for testing:

- Email: `demo@financeflow.app`
- Password: `Budget2026!`

## Tech used

- React
- Vite
- JavaScript
- CSS

## Run it locally

Install packages:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Build it:

```bash
npm run build
```

## Deploy

This frontend is deployed as a static site.

Render settings:

- Branch: `master`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

If the Render site was created manually, those settings have to be set in the Render dashboard.

## Backend note

The backend is still separate at the moment.

Later on I want to replace the temporary frontend login with real backend authentication and connect the dashboard to real finance data. The main place for that handoff is in `src/App.jsx`.

## Project structure

```text
src/
  assets/
  components/
    ActivityFeed.jsx
    Counter.jsx
    LoginForm.jsx
    Navbar.jsx
    RegisterForm.jsx
    SessionPanel.jsx
  App.jsx
  App.css
  index.css
```

## Extra note

This version is mainly for the frontend side of the project and for presentation/demo purposes while the backend is still being worked on.
