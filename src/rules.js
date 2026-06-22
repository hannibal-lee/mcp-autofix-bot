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
    if (property?.type !== "boolean") {
      return false;
    }

    const normalizedName = String(name).replace(/-/g, "_").toLowerCase();
    if (["confirm", "confirmed", "approval", "approved", "dry_run"].includes(normalizedName)) {
      return true;
    }

    const description = String(property?.description ?? "");
    return /\b(confirm|confirmation|approval|approved|dry[- ]?run)\b/i.test(description);
  });
}

export function scanTool(tool) {
  const issues = [];
  const schema = tool.inputSchema ?? {};
  const properties = schema.properties ?? {};

  if (isVagueDescription(tool.description)) {
    issues.push({
      ruleId: "tool-description-vague",
      severity: "warning",
      tool: tool.name,
      message: "Tool description is too short or lacks a clear sentence boundary."
    });
  }

  if (DANGEROUS_TOOL_PATTERN.test(`${tool.name ?? ""} ${tool.description ?? ""}`) && !hasConfirmationProperty(schema)) {
    issues.push({
      ruleId: "dangerous-tool-needs-confirmation",
      severity: "error",
      tool: tool.name,
      message: "Potentially destructive or side-effectful tool does not expose a confirmation, preview, or dry-run field."
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
    }
  }

  return { issues };
}
