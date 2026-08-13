# Contributing

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
