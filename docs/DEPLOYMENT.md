# Deal Truth ML — deploy in one hour

Pair with `deal-truth` [docs/DEPLOYMENT.md](../../deal-truth/docs/DEPLOYMENT.md).

## Local (talk to the API)

```bash
cp .env.example .env
make login          # or set CLOUDFLARE_API_TOKEN
# set NGROK_AUTHTOKEN + a Dev Domain that is NOT the API domain
make up             # :8081 + ngrok :4041
```

The API `.env.example` already has `ML_SERVICE_BASE_URL=http://host.docker.internal:8081`.

## Production (Cloudflare Worker)

Do **not** deploy the Dockerfile to Render (or any PaaS). That runs `wrangler dev`, which is local-only and will fail with RPC size-limit errors.

```bash
npx wrangler secret put INTERNAL_API_TOKEN
npx wrangler deploy
```

Live URL after deploy:

```text
https://deal-truth-ml.debjyotipandit35.workers.dev
```

You must add:

| Item                 | Where                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| `INTERNAL_API_TOKEN` | `wrangler secret put` (not Git)                                               |
| Cloudflare account   | already logged in, or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` for CI |

Already in `wrangler.jsonc` (no fill): `ENABLE_GENERATION`, model IDs, batch limits, embedding dimension.

Then on the **API** VM:

```text
ML_SERVICE_BASE_URL=https://deal-truth-ml.debjyotipandit35.workers.dev
ML_SERVICE_API_KEY=<same INTERNAL_API_TOKEN>
ML_GENERATION_ENABLED=true
```

Do not put PyAI, Postgres, or SeaweedFS vars in this repo — they belong only on `deal-truth`.
