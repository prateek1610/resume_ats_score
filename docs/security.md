# ResumeLens security baseline

This document records the controls expected for a public deployment. It is an operational baseline, not a claim of certification or a substitute for an independent penetration test.

## Controls enforced in the application

- Google and all other unused OAuth routes are absent. Public Supabase authentication offers verified email/password and one-time email links only.
- New and replacement passwords accept 15–128 characters, allow passphrases, reject a short list of obvious common values, and are never logged or stored by ResumeLens.
- Password attempts and email deliveries use separate persistent per-address and per-account rate limits. Authentication responses avoid revealing whether an email exists.
- Sessions are validated against Supabase on the server. Sign-out is a same-origin `POST`, password recovery revokes sessions globally, and protected pages are private and non-cacheable.
- Every browser mutation requires same-origin `Origin` or `Referer` evidence and rejects cross-site Fetch Metadata. JSON and multipart endpoints require their expected content type and bounded request size.
- A per-request nonce protects executable scripts. Additional headers deny framing, MIME sniffing, unnecessary browser capabilities and cross-origin resource loading; HTTPS receives HSTS.
- Resumes use extension, MIME, signature, size, page, processing-time and extracted-text limits. DOCX central directories are inspected for unsafe paths, encryption, ZIP64, excessive entries, expanded size and compression ratio. PDFs containing active or embedded content are rejected.
- Files stay in private R2 storage. Every report, file download and deletion query is scoped to the server-verified owner. Public errors and structured logs exclude resume text, email addresses, credentials and raw infrastructure errors.

## Required Supabase launch settings

Before enabling Supabase in production, an operator must:

1. Keep **Confirm email** enabled and disable every unused provider, including Google.
2. Set the Site URL and redirect allowlist to the exact HTTPS production origin and `/auth/callback`. Do not use wildcard production redirects.
3. Configure custom SMTP with SPF, DKIM and DMARC for reliable verification and recovery delivery.
4. Enable leaked-password protection and CAPTCHA in Supabase Auth. CAPTCHA keys belong in the provider/platform configuration, never in source control.
5. Configure an inactivity timeout and maximum session lifetime appropriate to resume data (recommended starting point: 30 minutes inactive and 24 hours maximum), then test recovery and session revocation.
6. Keep anonymous sign-ins and manual account linking disabled unless a reviewed product requirement adds them.

## Operations

- Run `npm audit --omit=dev --audit-level=high`, unit/integration tests, lint, type checking and the production build in CI.
- Review authentication rate-limit events and unusual upload failures without adding personal data to logs.
- Rotate Supabase publishable credentials if exposed, revoke sessions after an incident, and use the hosting platform’s secret manager for runtime values.
- Commission an independent security review before handling regulated or highly sensitive data. ResumeLens does not provide malware scanning; organizations requiring it should add a quarantine and antivirus/CDR service before making uploaded files available to staff.
