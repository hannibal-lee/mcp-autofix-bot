# Contributing

Thanks for helping improve MCP tool quality.

## What Makes A Good Contribution

- A small rule that catches one concrete tool-schema problem.
- A before/after example showing the maintainer value.
- Tests that prove the rule fires and stays quiet when the schema is already clear.
- Conservative wording. The bot should suggest reviewable changes, not pretend to know project-specific intent.

## Rule Design Principles

- Prefer deterministic checks before model-generated suggestions.
- Avoid rewriting implementation code.
- Keep fixes limited to descriptions, input schemas, examples, and test fixtures.
- Treat dangerous tools with extra care: propose preview, confirmation, or dry-run semantics, but do not invent hidden runtime behavior.

## Local Development

```bash
npm install
npm test
npm run scan
```

## Opening Ecosystem PRs

Do not mass-open generated PRs. Use [docs/pr-targets.md](./docs/pr-targets.md), review the target repo's contribution rules, and keep every PR narrow.
