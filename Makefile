.PHONY: install setup login lint typecheck test test-live bootstrap check smoke dev up down restart docker-build compose-up compose-down deploy

install:
	npm install

bootstrap:
	bash scripts/bootstrap_env.sh

login:
	npx wrangler login
	npx wrangler whoami

setup: install bootstrap
	@echo ""
	@echo "Next:"
	@echo "  1. npx wrangler login     (or set CLOUDFLARE_API_TOKEN in .env for Docker)"
	@echo "  2. make dev               host wrangler on :8081"
	@echo "     or  make up            Docker wrangler on :8081"
	@echo "  3. In deal-truth/.env set ML_SERVICE_BASE_URL to localhost:8081 or the ngrok HTTPS URL"
	@echo "  4. Restart deal-truth api + worker"

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm test

test-live:
	npm run test:live

check:
	bash scripts/check_ready.sh http://127.0.0.1:8081 5

smoke: check
	curl -fsS -X POST http://127.0.0.1:8081/classify \
	  -H "Content-Type: application/json" \
	  -d '{"texts":["We cannot buy until security approves it."]}'
	@echo

# Host process (same role as deal-truth `make api`)
dev: bootstrap
	npx wrangler whoami
	npx wrangler dev --ip 0.0.0.0 --port 8081

# Docker stack (same role as deal-truth `make up`)
up:
	bash scripts/docker_up.sh

restart:
	docker compose up -d --build --force-recreate --no-deps ml ngrok

down:
	docker compose down --remove-orphans

docker-build:
	docker build -t deal-truth-ml:local .

compose-up: up

compose-down: down

deploy:
	npx wrangler secret put INTERNAL_API_TOKEN
	npx wrangler deploy
