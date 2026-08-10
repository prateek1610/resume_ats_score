# ResumeLens

ResumeLens is a production-ready ATS resume review web application. Signed-in users can upload a PDF or DOCX resume, run either a standalone ATS check or compare it with a target job description, receive a transparent score and prioritized recommendations, and return to saved reports later.

## Features

- Standalone ATS readiness and job-description match modes
- Deterministic, explainable scores for keywords, structure, impact, and essentials
- Deep resume diagnostics covering section health, measurable outcomes, action language, weak phrases, pronouns, bullet readability, and role-specific keyword coverage
- Recruiter-style strengths, improvement points, section-by-section feedback, prioritized fixes, and concrete rewrite examples
- Focused multi-route report workspace with Overview, Job Match, Resume Review, Rewrites, Missing Elements and Parsed Resume views
- PDF and DOCX text extraction with file-size, type, page, and processing limits
- Structured resume extraction for contact details, summary, skills, experience, education, certifications and source-linked bullet points
- Verified email/password and passwordless email-link authentication through Supabase Auth
- Email verification, secure password recovery, protected callback handling, and server-side session checks
- Private original-resume storage in R2 and report metadata/history in D1
- Saved report dashboard, private file download, and permanent report/file deletion
- Sample report journey that does not consume storage
- Responsive dark data-product interface with keyboard focus and reduced-motion support
- Input validation, structured error responses, rollback on partial upload failure, and basic structured logging
- Persistent per-user/IP burst protection and a 10-analysis rolling daily quota
- Content-signature validation, same-origin mutation checks, security headers, bounded client/server timeouts, and safe public error messages
- 30-day retention for new reports, opportunistic expired-file cleanup, individual deletion, and complete account-data deletion
- Public Privacy Policy and Terms of Use plus a database-aware health endpoint

ResumeLens is guidance software, not an employer ATS emulator. Scores can differ across hiring systems and do not guarantee an interview or job offer.

## Tech stack

| Layer | Technology |
| --- | --- |
| Full-stack framework | Next.js 16 via Vinext and React 19 |
| Runtime | Cloudflare Workers-compatible ESM |
| Database | Cloudflare D1 with Drizzle ORM |
| File storage | Cloudflare R2 |
| Authentication | Supabase Auth (`@supabase/ssr`) with password and magic link |
| Validation | Zod plus explicit file allowlists and limits |
| PDF/DOCX parsing | `unpdf` serverless PDF.js bundle and Mammoth |
| Styling | Tailwind CSS entry point with a custom accessible design system |
| Tests | Node test runner, TypeScript type checking, rendered Worker integration tests |

## Architecture

1. The public landing page explains the score and sends the user to a centralized ResumeLens login or signup journey.
2. Supabase Auth handles verified password accounts, magic links, password recovery and HTTP-only session cookies. A Next.js Proxy refreshes sessions before protected rendering.
3. The protected dashboard accepts a PDF or DOCX plus an optional job description.
4. `POST /api/reports` validates and parses the file, runs the deterministic scoring engine, uploads the original file to private R2, and writes the owned report to D1.
5. Protected report and download routes always query by both report ID and the normalized verified account email, preserving access to pre-migration reports.
6. Deleting a report removes its D1 record and associated R2 object.
7. New reports receive a 30-day expiry; expired rows are hidden immediately and cleaned from D1/R2 during normal service activity.
8. Public traffic is protected by persistent auth/analysis burst windows and a rolling 24-hour free-plan quota.

Important directories:

```text
app/                 pages and protected route handlers
components/          reusable report visualization
db/                  Drizzle database access and schema
drizzle/             generated SQL migrations
lib/                 scoring, parsing, auth, report, and storage services
tests/               unit and built-Worker integration tests
docs/api.md           API reference
```

## Local setup

Prerequisites:

- Node.js 22.13 or newer
- Linux or WSL with Bash, `curl`, `flock`, and GNU `timeout`

Install and start:

```bash
npm run install:ci
npm run dev
```

Without Supabase variables, the development-only preview identity in `lib/app-auth.ts` keeps the protected UI inspectable locally. When Supabase is configured, local and production requests use verified Supabase sessions instead.

## Environment and platform bindings

Copy `.env.example` to `.env.local` and replace the sample authentication values when testing the full login journey. Never use a Supabase `service_role` or secret key in this application.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Public client key used by the server-side auth adapter |
| `AUTH_SITE_URL` | Yes | Canonical origin used to construct safe callbacks; use `http://localhost:3000` locally |
| `RESUMELENS_ANALYTICS_ADMIN_EMAILS` | For analytics dashboard | Comma-separated server-only allowlist for `/admin/analytics` |

The application intentionally keeps these calls server-side, so no browser client or privileged Supabase key is required.

`.openai/hosting.json` declares the platform-managed bindings:

- `DB`: D1 database containing owned report records
- `BUCKET`: R2 bucket containing private original resumes

Do not commit binding credentials or local secrets. Hosted values and resources are injected by the Sites platform.

### Supabase production setup

1. Create a Supabase project and keep **Confirm email** enabled for password accounts.
2. In **Authentication → URL Configuration**, set the Site URL to the public ResumeLens origin and allow the exact `/auth/callback` URL. Add `http://localhost:3000/auth/callback` only for local development.
3. Keep every unused identity provider, including Google, disabled in **Authentication → Providers**.
4. Configure a custom SMTP provider and branded confirmation, magic-link and recovery templates before launch. Supabase’s default mail sender is intended for trial use and has restrictive project-wide limits.
5. Enable provider-side leaked-password protection, CAPTCHA, a reasonable inactivity timeout, and an exact redirect allowlist before launch. See [docs/security.md](docs/security.md).
6. Add the three variables above to the Sites production runtime, save a new Site version and deploy it. Until all three values exist, ResumeLens retains the previous Sign in with ChatGPT path as a no-break migration fallback.

Magic-link and recovery responses are deliberately generic so they do not reveal whether an email has an account. ResumeLens also applies persistent per-address and per-email auth limits in D1.

## Database setup

The current migration is checked in under `drizzle/`. After editing `db/schema.ts`, generate and inspect a new migration:

```bash
npm run db:generate
```

The hosting lifecycle applies checked-in migrations to the real D1 database.

## Quality commands

```bash
npm run lint
npm run typecheck
npm run test:unit
npm test
npm run build
npm run validate:artifact
```

`npm test` runs unit tests, builds the deployable Worker, validates its artifact, and runs rendered-Worker integration tests.

## API documentation

See [docs/api.md](docs/api.md) for route contracts, validation limits, authentication behaviour, and error formats.

## Deployment

The repository targets OpenAI Sites/Vinext. A production build must emit:

- `dist/server/index.js` with a default `fetch(request, env, ctx)` export
- `dist/.openai/hosting.json`
- `dist/.openai/drizzle/**` when migrations are present

Run `npm run build` for a local production validation. Deploy through the Sites checkpoint lifecycle so the exact validated commit, D1 migration, R2 binding, and access policy remain aligned.

## Security and privacy notes

- Accepted formats are allowlisted to PDF and DOCX; file extension, MIME type, size, page count, extracted text length, and parsing time are bounded.
- Uploads are stored under a one-way owner-derived prefix rather than an email address.
- Every report, delete, and download lookup includes the authenticated, verified owner email.
- Server authorization uses a Supabase-validated user record and never trusts an unverified cookie session object.
- Verification and recovery callbacks accept only safe internal return paths; mutation endpoints require same-origin Origin or Referer evidence.
- HTML uses a per-request script nonce and a restrictive CSP; protected/auth responses are private and non-cacheable.
- DOCX archives are bounded by entry count, expanded size and compression ratio; active PDF content is rejected before parsing.
- User strings are rendered as text; raw resume or job-description HTML is never injected.
- The scoring engine has no third-party AI/model dependency and never sends resume content to Supabase or another external model.
- Browser mutation requests are restricted to same-origin traffic, and unexpected infrastructure errors are never returned verbatim.
- Public access exposes the landing and legal pages; dashboard, report, download, deletion, and analysis routes still require authenticated identity.
- First-party analytics stores only anonymous daily aggregates for broad route categories and product outcomes. It uses no advertising cookies or third-party tracking scripts, and records expire after 90 days.

## License

MIT — see [LICENSE](LICENSE).
