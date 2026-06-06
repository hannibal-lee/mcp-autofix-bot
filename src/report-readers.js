export function normalizeNativeTools(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.tools)) {
    return payload.tools;
  }

  if (payload.result && Array.isArray(payload.result.tools)) {
    return payload.result.tools;
  }

  throw new Error("Expected a JSON array, { tools: [...] }, or MCP tools/list result.");
}

function slugify(value) {
  return String(value ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSeverity(value, fallback = "warning") {
  const severity = String(value ?? fallback).toLowerCase();
  return severity === "error" ? "error" : "warning";
}

function issueFromLint(issue) {
  return {
    ruleId: issue.ruleId ?? issue.rule ?? "mcp-lint/issue",
    severity: normalizeSeverity(issue.severity),
    tool: issue.tool ?? issue.toolName,
    property: issue.property,
    path: issue.path,
    message: issue.message ?? "mcp-lint reported a tool schema issue.",
    source: "mcp-lint"
  };
}

function issueFromAssert(result) {
  const assertion = result.assertion ?? result.name ?? result.ruleId ?? "assertion";
  return {
    ruleId: result.ruleId ?? `mcp-assert/${slugify(assertion)}`,
    severity: normalizeSeverity(result.severity, "error"),
    tool: result.tool ?? result.toolName ?? result.target?.tool,
    property: result.property ?? result.target?.property,
    path: result.path ?? result.target?.path,
    message: result.message ?? "mcp-assert reported a failing assertion.",
    source: "mcp-assert"
  };
}

function toolFromDiffPath(path) {
  const match = String(path ?? "").match(/(?:^|\.)tools\.([^.]+)/);
  return match?.[1];
}

function propertyFromDiffPath(path) {
  const match = String(path ?? "").match(/\.properties\.([^.]+)/);
  return match?.[1];
}

function issueFromDiff(change) {
  return {
    ruleId: change.ruleId ?? `mcpdiff/${slugify(change.type ?? "change")}`,
    severity: normalizeSeverity(change.severity),
    tool: change.tool ?? toolFromDiffPath(change.path),
    property: change.property ?? propertyFromDiffPath(change.path),
    path: change.path,
    message: change.message ?? "mcpdiff reported a tool schema change.",
    source: "mcpdiff"
  };
}

export function normalizeExternalReport(payload) {
  if (Array.isArray(payload?.issues) && (payload.tool === "mcp-lint" || payload.source === "mcp-lint")) {
    return {
      sourceTool: "mcp-lint",
      issues: payload.issues.map(issueFromLint)
    };
  }

  if (Array.isArray(payload?.results) && (payload.tool === "mcp-assert" || payload.source === "mcp-assert")) {
    return {
      sourceTool: "mcp-assert",
      issues: payload.results.filter((result) => result.status !== "passed").map(issueFromAssert)
    };
  }

  if (Array.isArray(payload?.changes) && (payload.tool === "mcpdiff" || payload.source === "mcpdiff")) {
    return {
      sourceTool: "mcpdiff",
      issues: payload.changes.map(issueFromDiff)
    };
  }

  throw new Error("Expected an mcp-lint, mcp-assert, or mcpdiff report.");
}
