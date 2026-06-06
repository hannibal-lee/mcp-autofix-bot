function formatTarget(item) {
  if (!item.tool) {
    return "`unknown tool`";
  }

  if (item.property) {
    return `\`${item.tool}.${item.property}\``;
  }

  return `\`${item.tool}\``;
}

function formatFix(fix) {
  return `- ${formatTarget(fix)}: ${fix.title}`;
}

function formatManualReview(item) {
  const detail = item.message ? ` - ${item.message}` : "";
  return `- ${formatTarget(item)}: ${item.ruleId}${detail}`;
}

export function buildPrDraft(report) {
  const fixes = report.fixes ?? [];
  const manualReview = report.manualReview ?? [];
  const summary = report.summary ?? {};
  const lines = [
    "This PR improves MCP tool schema clarity so agents have more precise execution contracts before choosing tools or arguments.",
    "",
    "## Summary",
    "",
    `- Planned deterministic fixes: ${fixes.length}`,
    `- Reported issues: ${summary.issueCount ?? 0}`,
    `- Errors: ${summary.errorCount ?? 0}`,
    `- Warnings: ${summary.warningCount ?? 0}`,
    "",
    "## Planned Changes",
    ""
  ];

  if (fixes.length === 0) {
    lines.push("- No deterministic fixes were planned from this report.");
  } else {
    lines.push(...fixes.map(formatFix));
  }

  lines.push("", "## Review Notes", "");

  if (fixes.some((fix) => fix.requiresReview)) {
    lines.push("- Generated wording is review-marked and should be checked by a maintainer before merge.");
  }

  if (manualReview.length > 0) {
    lines.push("- Manual review still required:");
    lines.push(...manualReview.map(formatManualReview));
  } else {
    lines.push("- No unsupported issues were routed to manual review.");
  }

  lines.push(
    "",
    "## Safety Note",
    "",
    "This improves tool clarity, schema quality, and reviewability. This does not claim the server is safe or free from prompt injection risks."
  );

  return {
    title: "Improve MCP tool schemas for clearer agent use",
    body: lines.join("\n")
  };
}
