const FIX_TEMPLATES = {
  "tool-description-vague": {
    title: "Clarify tool purpose and safe-use boundaries",
    action: "replace-tool-description",
    patchHint:
      "Expand the description with the operation scope, side effects, failure modes, and user-visible result."
  },
  "dangerous-tool-needs-confirmation": {
    title: "Require confirmation or dry-run for side-effectful action",
    action: "add-confirmation-property",
    patchHint:
      "Add a confirmation, preview, or dry_run field and describe when callers must use it before execution."
  },
  "property-description-missing": {
    action: "add-property-description",
    patchHint:
      "Add a concise property description that states format, constraints, examples, and whether the value is user-controlled."
  }
};

function fixTitle(issue, template) {
  if (issue.ruleId === "property-description-missing") {
    return `Describe input property "${issue.property}"`;
  }

  return template.title;
}

function buildFix(issue, template) {
  return {
    ruleId: issue.ruleId,
    severity: issue.severity,
    tool: issue.tool,
    property: issue.property,
    title: fixTitle(issue, template),
    action: template.action,
    patchHint: template.patchHint,
    requiresReview: true
  };
}

function buildManualReview(issue) {
  return {
    ruleId: issue.ruleId,
    severity: issue.severity,
    tool: issue.tool,
    property: issue.property,
    source: issue.source,
    message: issue.message,
    reason: "No deterministic autofix is available for this issue."
  };
}

export function planFixes(issues) {
  const fixes = [];
  const manualReview = [];

  for (const issue of issues) {
    const template = FIX_TEMPLATES[issue.ruleId];
    if (!template || issue.source) {
      manualReview.push(buildManualReview(issue));
      continue;
    }

    fixes.push(buildFix(issue, template));
  }

  return { fixes, manualReview };
}
