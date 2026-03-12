This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# HRPerformance

## Database Backup & Export

### Run both at once (recommended)

```bash
npm run backup && npm run export-to-github
```

This is the standard backup command to run before making any major changes or at the end of each day. It performs two independent backup operations in sequence.

---

### Individual commands

#### `npm run backup`

Creates a full **PostgreSQL SQL dump** of the database and saves it as a timestamped `.sql` file inside the `backups/` folder.

- Output: `backups/hrperformance_YYYYMMDD_HHMMSS.sql`
- Keeps the last **30 backups** automatically (older ones are deleted)
- Use this to **fully restore** the database to any saved point in time
- Restore command: `npm run restore`

#### `npm run export-to-github`

Exports all **employee and weekly record data as JSON** and commits it to the Git repository as a lightweight backup that can be tracked in version control.

- Output: `data-exports/employees_YYYYMMDD_HHMMSS.json` and `data-exports/employees_latest.json`
- Useful for **reviewing past data** or **importing records** into a fresh database
- Import command: `npm run import-from-json`

---

### Other commands

| Command | Description |
|---|---|
| `npm run restore` | Restore the database from a `.sql` backup file in `backups/` |
| `npm run import-from-json` | Import employee data from the latest JSON export back into the database |
| `npm run seed` | Safely seed initial department and employee data (will not overwrite existing records) |

---

## New Server Setup Guide

**Yes — Prisma commands are required on every new server.** The database schema does not exist yet on a fresh machine, so you must run migrations before starting the app.

Follow these steps in order:

### Step 1 — Prerequisites

Make sure the following are installed on the new server:

- **Node.js** v18 or higher (`node -v` to check)
- **PostgreSQL** v14 or higher (`psql --version` to check)
- **npm** (`npm -v` to check)
- **Git** (`git --version` to check)

### Step 2 — Clone the repository

```bash
git clone <your-repo-url> hrperformance
cd hrperformance
npm install
```

### Step 3 — Create the environment file

Create a file named `.env.local` in the project root. This file is **not included in Git** and must be created manually on each new server.

```bash
# .env.local

# PostgreSQL connection string — update user, host, port, and database name to match the new server
DATABASE_URL="postgresql://<your-db-user>@localhost:5432/hrperformance"

# Google Gemini API key — used for AI-generated performance comments
GEMINI_API_KEY=your_gemini_api_key_here

# SMTP email settings — used for sending weekly and monthly performance report emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@wuc.edu
SMTP_PASS=your_gmail_app_password_here
SMTP_SECURE=false

# Display name in the From field of sent emails
HR_EMAIL_FROM=Human Resources <your_email@wuc.edu>
```

> **Important:** `SMTP_PASS` must be a **Gmail App Password**, not your regular Gmail password. Generate one at myaccount.google.com → Security → App passwords.

### Step 4 — Create the PostgreSQL database

```bash
createdb hrperformance
```

If your PostgreSQL uses a specific user:

```bash
createdb -U your-db-user hrperformance
```

### Step 5 — Run Prisma migrations ⚠️ Required

This creates all the database tables on the new server:

```bash
npx prisma migrate deploy
```

Then generate the Prisma client (required so the app can talk to the database):

```bash
npx prisma generate
```

Or run both with the built-in shortcut:

```bash
npm run setup-db
```

### Step 6 — Restore your data

**Option A — Restore from a SQL backup** (recommended, restores everything):

```bash
psql hrperformance < backups/hrperformance_YYYYMMDD_HHMMSS.sql
```

Replace the filename with the most recent `.sql` file in the `backups/` folder.

**Option B — Import from JSON export** (restores employee + weekly records only):

```bash
npm run import-from-json
```

### Step 7 — Start the app

```bash
npm run dev
```

The app runs on **http://localhost:3001** by default.

---

### What to update when moving to a new server

| Item | Where to change | Why |
|---|---|---|
| `DATABASE_URL` | `.env.local` | New server has a different PostgreSQL user/hostname |
| `SMTP_USER` / `SMTP_PASS` | `.env.local` | Gmail credentials are account-specific |
| `GEMINI_API_KEY` | `.env.local` | API key is tied to a Google Cloud account |
| `HR_EMAIL_FROM` | `.env.local` | Should match the SMTP sending account |
| PostgreSQL version | System install | Must match or exceed v14 for migrations to work |
| Port number | `package.json` → `dev` / `start` scripts | Default is 3001, change if that port is in use |
