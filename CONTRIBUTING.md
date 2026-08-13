# Contributing

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars
make test
make lint
make format-check
make typecheck
```

`npm install` enables Husky git hooks.

## Git hooks

- **pre-commit:** lint-staged runs ESLint `--fix` and Prettier on staged files.
- **commit-msg:** commitlint enforces Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`, …). Emoji in the subject is allowed. Max header 120 characters.

Examples:

```
fix: chunk classify so Qwen returns valid JSON 🧩
feat: add Swagger UI at /docs
```

Skip hooks only if you must: `HUSKY=0 git commit ...` (do not use this to hide secrets).

## Rules

- Keep emotion, buying intent, and deal signals as separate outputs.
- Models return segment IDs only — never timestamps or invented quotes.
- Do not log transcript text, embeddings, prompts, or tokens. Structured logs use `event` + counts/ids only.
- Do not commit `.dev.vars`, API tokens, or model weights.
- Prefer fake `env.AI` tests. Gate live Workers AI tests with `RUN_MODEL_TESTS=1`.
- Quality-path (120B) calls are for judge / Ask synthesis only.

## PR checklist

- [ ] Unit + contract tests pass
- [ ] Lint and typecheck pass
- [ ] Named errors used for failures
- [ ] Docs updated if the HTTP contract changed

## Setup

```bash
npm install
cp .dev.vars.example .dev.vars
npm test
npm run lint
npm run typecheck
```

## Rules

- Keep emotion, buying intent, and deal signals as separate outputs.
- Models return segment IDs only — never timestamps or invented quotes.
- Do not log transcript text.
- Do not commit `.dev.vars`, API tokens, or model weights.
- Prefer fake `env.AI` tests. Gate live Workers AI tests with `RUN_MODEL_TESTS=1`.
- Quality-path (120B) calls are for judge / Ask synthesis only.

## PR checklist

- [ ] Unit + contract tests pass
- [ ] Lint and typecheck pass
- [ ] Named errors used for failures
- [ ] Docs updated if the HTTP contract changed
