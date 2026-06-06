# PR Target Research Template

Use this table before opening real ecosystem PRs. Keep it honest; do not automate outbound PRs until the maintainers' style and contribution rules are understood.

| Repo | Maintainer activity | Tool schema location | Issues found | Proposed PR scope | Status |
| --- | --- | --- | --- | --- | --- |
| example/mcp-server | Recent commits and open PR reviews | `src/tools.ts` | Vague delete tool description | One schema + fixture update | Draft |

## Selection Criteria

- Active maintainers within the last 30 days.
- Existing tests or examples for tools.
- Clear contribution guidelines.
- At least one actionable schema or description issue.
- No broad refactors needed.

## PR Message Template

```text
Hi! I noticed a couple of MCP tool descriptions that could be clearer for agent callers.

This PR keeps the implementation unchanged and only tightens tool descriptions / input schema metadata so clients can reason about scope, side effects, and required arguments more reliably.

I reviewed the generated wording manually. Happy to adjust to the wording style you prefer.
```
