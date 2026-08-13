# Security

## Reporting

Email or open a private report. Do not file public issues that include tokens, transcripts, or customer data.

## Practice

- Store `INTERNAL_API_TOKEN` as a wrangler secret, never in Git.
- Compare bearer tokens with `timingSafeEqual`.
- Leave health endpoints unauthenticated; protect inference routes when a token is configured.
- Do not enable permissive CORS.
- Do not log complete transcript text, bearer tokens, or Cloudflare credentials.
- Treat Workers AI prompts as untrusted application data — still validate JSON with zod.
- No customer audio or real call transcripts in fixtures.

If a secret is committed, rotate it immediately (`wrangler secret put INTERNAL_API_TOKEN`) and purge the leaked value from git history.
