# Hosting

## Local (Docker Compose) — same role as API `make up`

```bash
cp .env.example .env          # set CLOUDFLARE_API_TOKEN
make up                       # publishes http://localhost:8081
make down
```

`make up` runs `scripts/docker_up.sh`: bootstrap env files → `docker compose up --build -d --wait` → poll `/health/live`.

The image runs `wrangler dev`. Inference is **Workers AI**, not local weights.

Point **deal-truth**:

```text
# API process on the host
ML_SERVICE_BASE_URL=http://localhost:8081

# API/Celery in Docker
ML_SERVICE_BASE_URL=http://host.docker.internal:8081

ML_SERVICE_API_KEY=
ML_GENERATION_ENABLED=true
```

## Local (host wrangler)

```bash
make setup
make login
make dev
```

Same port **8081** so the API `.env` does not change.

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
