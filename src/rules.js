export const DANGEROUS_TOOL_PATTERN =
  /\b(delete|remove|destroy|drop|purge|overwrite|write|send|email|charge|pay|deploy|execute|exec|run|shell)\b/i;

export function isVagueDescription(description) {
  if (typeof description !== "string") {
    return true;
  }

  const trimmed = description.trim();
  return trimmed.length < 40 || !/[.!?]$/.test(trimmed);
}

export function hasConfirmationProperty(schema = {}) {
  const properties = schema.properties ?? {};
  return Object.entries(properties).some(([name, property]) => {
    const description = String(property?.description ?? "");
    return /confirm|approval|dry[- ]?run|preview/i.test(`${name} ${description}`);
  });
}

export function scanTool(tool) {
  const issues = [];
  const fixes = [];
  const schema = tool.inputSchema ?? {};
  const properties = schema.properties ?? {};

  if (isVagueDescription(tool.description)) {
    issues.push({
      ruleId: "tool-description-vague",
      severity: "warning",
      tool: tool.name,
      message: "Tool description is too short or lacks a clear sentence boundary."
    });
    fixes.push({
      tool: tool.name,
      title: "Clarify tool purpose and safe-use boundaries",
      patchHint:
        "Expand the description with the operation scope, side effects, failure modes, and user-visible result."
    });
  }

  if (DANGEROUS_TOOL_PATTERN.test(`${tool.name ?? ""} ${tool.description ?? ""}`) && !hasConfirmationProperty(schema)) {
    issues.push({
      ruleId: "dangerous-tool-needs-confirmation",
      severity: "error",
      tool: tool.name,
      message: "Potentially destructive or side-effectful tool does not expose a confirmation, preview, or dry-run field."
    });
    fixes.push({
      tool: tool.name,
      title: "Require confirmation or dry-run for side-effectful action",
      patchHint:
        "Add a confirmation, preview, or dry_run field and describe when callers must use it before execution."
    });
  }

  for (const [propertyName, property] of Object.entries(properties)) {
    if (!property?.description) {
      issues.push({
        ruleId: "property-description-missing",
        severity: "warning",
        tool: tool.name,
        property: propertyName,
        message: `Input property "${propertyName}" is missing a description.`
      });
      fixes.push({
        tool: tool.name,
        title: `Describe input property "${propertyName}"`,
        patchHint:
          "Add a concise property description that states format, constraints, examples, and whether the value is user-controlled."
      });
    }
  }

  return { issues, fixes };
}
