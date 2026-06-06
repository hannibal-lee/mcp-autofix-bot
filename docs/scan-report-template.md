# MCP Tool Quality Scan Report

Date: YYYY-MM-DD

Repos scanned: 0

## Summary

This report summarizes recurring MCP tool schema and description issues found while preparing `mcp-autofix-bot` PRs.

## Recurring Issues

| Issue | Count | Why it matters |
| --- | ---: | --- |
| Vague tool description | 0 | Agents may choose the wrong tool or miss important side effects. |
| Missing property description | 0 | Agents may pass malformed or unsafe arguments. |
| Side-effectful tool lacks confirmation semantics | 0 | Agents may execute destructive actions without a reviewable preview. |

## Representative Fixes

Link each example to a real PR once available.

## Caveats

This work improves clarity and reviewability. It does not prove that an MCP server is safe or free from prompt injection risks.
