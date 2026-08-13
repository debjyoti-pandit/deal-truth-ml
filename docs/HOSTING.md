# Hosting

## Local (Docker Compose) — same role as API `make up`

```bash
make up                       # :8081 + ngrok inspector :4041
make down
```

`make up` runs `scripts/docker_up.sh`: bootstrap env files → `docker compose up --build -d --wait` (ml + ngrok) → poll `/health/live` → print the public HTTPS URL.

The image runs `wrangler dev`. Inference is **Workers AI**, not local weights.

ngrok inspector is **4041** so it can run next to the API tunnel on **4040**. `NGROK_DOMAIN` must be a **different** reserved hostname than the API (dashboard → [domains](https://dashboard.ngrok.com/domains)).

Point **deal-truth**:

```text
# Same machine, API on host
ML_SERVICE_BASE_URL=http://localhost:8081

# Same machine, API in Docker (Mac/Windows)
ML_SERVICE_BASE_URL=http://host.docker.internal:8081

# Remote API / Oracle VM / no host gateway
ML_SERVICE_BASE_URL=https://<NGROK_DOMAIN from this repo's make up>

ML_SERVICE_API_KEY=
ML_GENERATION_ENABLED=true
```

## Local (host wrangler)

```bash
make setup
make login
make dev
```

Same port **8081**. ngrok still comes from `make up` (Compose). Host-only `make dev` does not start ngrok.

## Production

This service is a Cloudflare Worker. The Docker image is for **local** wrangler only.

```bash
npx wrangler secret put INTERNAL_API_TOKEN
npx wrangler deploy
```

```text
ML_SERVICE_BASE_URL=https://deal-truth-ml.<account>.workers.dev
ML_SERVICE_API_KEY=<same as INTERNAL_API_TOKEN>
```

## Observability

Workers observability is on in `wrangler.jsonc`. Logs include request ID, item/character counts, model, duration, named error. No transcript text. No Prometheus `/metrics`.

## Quota

Workers Free: 10,000 neurons/day. Exhaustion → HTTP 429 `QUOTA_EXCEEDED`.

## Fallback infra (not this repo)

If Oracle Always Free A1 is unavailable, keep this Worker and move the API. Do not run models on the VM.
