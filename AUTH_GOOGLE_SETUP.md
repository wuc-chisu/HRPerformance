# Google Sign-In setup

The application uses Auth.js with Google OAuth and database-backed sessions. A
Google account can sign in only when its verified email matches an active
Employee record. An employee is active when their offboarding record does not
have `step8.confirmedOffboard` set to `true`. System Role, manager relationships,
direct reports, training assignments, permissions, and View Mode continue to
come from the matched Employee record and existing HR logic.

## Google OAuth client

Create a Google OAuth client of type **Web application** in Google Cloud
Console. Add these authorized redirect URIs:

- Local app (the `npm run dev` script uses port 3001):
  `http://localhost:3001/api/auth/callback/google`
- Production:
  `https://accounts.wuc-hr-system-hr-gnhan7-e41e68-3-20-225-73.sslip.io/api/auth/callback/google`

If you also run Next.js directly on port 3000, add
`http://localhost:3000/api/auth/callback/google` as an additional redirect URI.

## Environment variables

Set these in local `.env.local` and the production environment:

```dotenv
AUTH_GOOGLE_ID=your_google_oauth_client_id
AUTH_GOOGLE_SECRET=your_google_oauth_client_secret
AUTH_SECRET=unique_random_secret
AUTH_URL=http://localhost:3001
AUTH_TRUST_HOST=true
```

Use the production application origin for `AUTH_URL` in production:

```dotenv
AUTH_URL=https://accounts.wuc-hr-system-hr-gnhan7-e41e68-3-20-225-73.sslip.io
```

Generate a different `AUTH_SECRET` for each environment, for example with
`openssl rand -base64 32`. Keep all secrets out of source control. The callback
URL is based on `AUTH_URL`; the Google redirect URI must match it exactly.

Google credentials can be separate for development and production, or the same
OAuth client can be configured with both callback URLs. The app does not rely
on Google Workspace domain filtering for authorization; the active Employee
email match is the access control.
