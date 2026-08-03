# ResumeLens

ResumeLens is a production-ready ATS resume review web application. Signed-in users can upload a PDF or DOCX resume, run either a standalone ATS check or compare it with a target job description, receive a transparent score and prioritized recommendations, and return to saved reports later.

## Features

- Standalone ATS readiness and job-description match modes
- Deterministic, explainable scores for keywords, structure, impact, and essentials
- Deep resume diagnostics covering section health, measurable outcomes, action language, weak phrases, pronouns, bullet readability, and role-specific keyword coverage
- Recruiter-style strengths, improvement points, section-by-section feedback, prioritized fixes, and concrete rewrite examples
- PDF and DOCX text extraction with file-size, type, page, and processing limits
- Sign in with ChatGPT and server-side ownership checks
- Private original-resume storage in R2 and report metadata/history in D1
- Saved report dashboard, private file download, and permanent report/file deletion
- Sample report journey that does not consume storage
- Responsive dark data-product interface with keyboard focus and reduced-motion support
- Input validation, structured error responses, rollback on partial upload failure, and basic structured logging

ResumeLens is guidance software, not an employer ATS emulator. Scores can differ across hiring systems and do not guarantee an interview or job offer.

## Tech stack

| Layer | Technology |
| --- | --- |
| Full-stack framework | Next.js 16 via Vinext and React 19 |
| Runtime | Cloudflare Workers-compatible ESM |
| Database | Cloudflare D1 with Drizzle ORM |
| File storage | Cloudflare R2 |
| Authentication | Dispatch-owned Sign in with ChatGPT |
| Validation | Zod plus explicit file allowlists and limits |
| PDF/DOCX parsing | `unpdf` serverless PDF.js bundle and Mammoth |
| Styling | Tailwind CSS entry point with a custom accessible design system |
| Tests | Node test runner, TypeScript type checking, rendered Worker integration tests |

## Architecture

1. The public landing page explains the score and sends the user through ChatGPT sign-in.
2. The protected dashboard accepts a PDF or DOCX plus an optional job description.
3. `POST /api/reports` validates and parses the file, runs the deterministic scoring engine, uploads the original file to private R2, and writes the owned report to D1.
4. Protected report and download routes always query by both report ID and authenticated email.
5. Deleting a report removes its D1 record and associated R2 object.

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

The development-only preview identity in `lib/app-auth.ts` makes the protected UI inspectable locally. Production builds never use that fallback and require authenticated platform headers.

## Environment and platform bindings

Copy `.env.example` to `.env.local` only if you add optional local values. The default scoring engine does not require an API key.

`.openai/hosting.json` declares the platform-managed bindings:

- `DB`: D1 database containing owned report records
- `BUCKET`: R2 bucket containing private original resumes

Do not commit binding credentials or local secrets. Hosted values and resources are injected by the Sites platform.

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
- Every report, delete, and download lookup includes the authenticated owner email.
- User strings are rendered as text; raw resume or job-description HTML is never injected.
- The application has no third-party AI/API dependency and does not send resume content to an external model.

## License

MIT — see [LICENSE](LICENSE).
