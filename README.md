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
