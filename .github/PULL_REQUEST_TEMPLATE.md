## Summary

<!-- What MCP tool schema or description quality issue does this change address? -->

## Review notes

- [ ] The diff is limited to tool descriptions, schemas, examples, or fixtures.
- [ ] Side-effectful tools clearly describe confirmation, preview, or dry-run behavior.
- [ ] Input properties document format, constraints, and user-controlled values.
- [ ] Generated wording was reviewed by a human maintainer before merge.

## Verification

```bash
npm test
npx mcp-autofix-bot scan examples/bad-mcp-server/tools.json --json
```
