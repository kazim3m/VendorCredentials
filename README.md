# Vendor / Freelancer Document Collection System

Production-ready Next.js 14 App Router repository for collecting vendor/freelancer KYC docs, generating PDFs, exporting project ZIP bundles, OTP authentication, and daily expiry checking using Vercel Cron.

## Stack

- Next.js 14+ App Router with TypeScript
- TailwindCSS
- Prisma ORM + PostgreSQL (Vercel Postgres)
- Vercel Blob (`@vercel/blob`) client uploads + server private file delivery
- PDF generation with `pdf-lib` + `sharp`
- ZIP generation with `archiver`
- Email via Resend SDK
- OTP auth with 6-digit codes (hashed in DB), httpOnly signed session cookie
- Daily cron via `vercel.json` calling `/api/cron/expiry`

## Environment Variables

Copy `.env.example` and set:

- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET`
- `RESEND_API_KEY`
- `OTP_FROM_EMAIL`
- `ALERT_TO_EMAIL`
- `SESSION_SECRET`

## Local development

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Open: `http://localhost:3000`

## Vercel setup

Pull project env vars:

```bash
vercel env pull
```

Deploy migration and generate Prisma client in build flow:

```bash
npm run prisma:migrate
```

The seed script ensures the default admin exists:

- `kazim.naim@3monkeys.net`

Run:

```bash
npm run prisma:seed
```

## OTP Auth flow

1. User enters email on `/login`
2. API generates random 6-digit OTP
3. SHA-256 hash stored in `otp_codes` with 10-minute expiry
4. OTP sent through Resend
5. User enters OTP, verified against latest active hash + expiry
6. Server creates DB session + signed cookie (`vendor_session`)

## Route protection

- `/admin/*` requires `ADMIN`
- `/app/*` requires authenticated user

## Uploads (Vercel Blob client uploads)

Route: `POST /api/upload/token`

- Requires authenticated user
- Validates person ownership:
  - ADMIN can upload for any person
  - USER can upload only if `user.personId === person.id`
- Allows only `image/jpeg`, `image/jpg`, `image/png`
- Maximum file size: 10MB

Client calls `upload(..., { handleUploadUrl: "/api/upload/token" })`, then persists the returned blob metadata via:

- `POST /api/upload/complete`

## PDF generation

Route: `POST /api/admin/people/:id/generate-pdf`

Steps:

1. Fetch photo/passport/eid images from Blob
2. Normalize with `sharp` (EXIF rotate, max 2000px, PNG output)
3. Build 3-page PDF:
   - Page 1: passport-size photo
   - Page 2: passport scan
   - Page 3: EID front + back (side-by-side)
4. Upload to Blob private storage
5. Save `pdfBlobKey` and `pdfBlobUrl`

Filename format:

- `FirstName_LastName.pdf`

## Project export

Route: `POST /api/admin/projects/:id/export`

Generates:

- `project_roster.csv` with required fields
- Per-person ZIP: `First_Last.zip` containing:
  - `First_Last.pdf`
  - `First_Last_photo.jpg`
  - `First_Last_passport.jpg`
  - `First_Last_eid_front.jpg`
  - `First_Last_eid_back.jpg`
- Project ZIP containing CSV + all per-person ZIPs

Project ZIP is uploaded to Blob private store and API returns a short-lived signed download URL:

- `/api/admin/files?path=<blob-path>&expires=<ts>&sig=<hmac>`

## Cron expiry checker

Route: `GET /api/cron/expiry`

- Requires `Authorization: Bearer ${CRON_SECRET}`
- Computes statuses with date-only compare in `Asia/Dubai`:
  - `EXPIRED` if expiry date < today
  - `EXPIRING_SOON` if days left is between 0 and 30
  - else `OK`
- Updates `passportStatus` + `eidStatus`
- Sends summary email to `ALERT_TO_EMAIL` once per day (anti-spam via `notifiedAt`)

Manual run:

```bash
npm run check:expiry
```

## Vercel Cron config

`vercel.json` includes:

```json
{
  "crons": [{ "path": "/api/cron/expiry", "schedule": "0 0 * * *" }]
}
```

Set cron secret header in Vercel (or via trigger tooling) when calling the endpoint.
