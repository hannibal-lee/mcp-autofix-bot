# Launch Playbook

Positioning: **Renovate for MCP tool quality**.

Do not pitch this as "AI rewrites docs." Pitch it as a maintainer workflow that catches unclear execution contracts before agents misuse tools.

## Phase 1: Earn Proof

Pick 10 to 20 MCP servers with active maintainers and visible tool schemas. Run the scanner locally, hand-review every suggestion, then open at most one narrow PR per repo.

Acceptance target before public launch:

- 5 real PRs opened,
- 2 merged or meaningfully discussed,
- 1 short scan report written,
- 1 demo GIF or SVG recorded,
- 1 GitHub Action example verified.

## Phase 2: Publish Evidence

Write a case study:

> We improved tool schemas across real MCP servers. Here is what broke most often.

Include:

- recurring issue categories,
- before/after diffs,
- PR links,
- lessons learned for MCP maintainers,
- clear caveat that the bot improves reviewability, not guaranteed safety.

## Phase 3: Submit To MCP Directories

Submit only after real PR evidence exists:

- awesome MCP server lists,
- MCP Star,
- mcpdrop,
- MCP Discord/community directories,
- GitHub Actions Marketplace if the action is packaged.

## Phase 4: Developer Launch

Recommended order:

1. Hacker News `Show HN`.
2. Reddit `r/mcp` and `r/LocalLLaMA`.
3. MCP Discord.
4. X / LinkedIn with PR screenshots.
5. V2EX only if the post stays English-only and links to the same technical evidence.
6. Product Hunt only after there is usage and social proof.

## Launch Copy

### Hacker News

Title:

```text
Show HN: A bot that fixes unclear MCP tool schemas and opens PRs
```

Body:

```text
I built mcp-autofix-bot because many MCP tools work at the protocol level but are hard for agents to use safely. The bot scans tool descriptions and JSON Schemas, flags unclear or side-effectful tools, and prepares small PRs maintainers can review.

The goal is not to "AI rewrite docs." It is to make tool descriptions more like execution contracts: clear scope, input semantics, side effects, and confirmation behavior.

Repo: <repo-url>
Demo: <demo-url>
```

### V2EX

Use the same English launch copy as Hacker News. Do not add localization, translated docs, or separate non-English positioning before the project has real maintainer adoption.

## Guardrails

- Never mass-open PRs.
- Never claim "secure by default."
- Always show exact generated diffs.
- Keep each PR limited to schema, description, examples, and tests.
- Add a human-reviewed note when suggestions were manually edited.
