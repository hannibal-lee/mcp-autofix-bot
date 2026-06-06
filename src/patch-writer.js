import { planFixes } from "./fix-planner.js";
import { normalizeNativeTools } from "./report-readers.js";
import { scanTool } from "./rules.js";

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function findToolIndex(tools, toolName) {
  return tools.findIndex((tool) => tool.name === toolName);
}

function reviewDescription(toolName) {
  return `[REVIEW REQUIRED] Describe what ${toolName} does, when agents should call it, side effects, failure modes, and the user-visible result.`;
}

function reviewPropertyDescription(propertyName) {
  return `[REVIEW REQUIRED] Describe ${propertyName}, including format, constraints, examples, and whether it is user-controlled.`;
}

function confirmationDescription(toolName) {
  return `Set to true only after the caller has reviewed the planned ${toolName} action and accepts its side effects.`;
}

function applyFix(preview, fix) {
  const tools = normalizeNativeTools(preview);
  const toolIndex = findToolIndex(tools, fix.tool);
  if (toolIndex === -1) {
    return null;
  }

  const tool = tools[toolIndex];
  const schema = tool.inputSchema ?? { type: "object", properties: {} };
  schema.type ??= "object";
  schema.properties ??= {};
  tool.inputSchema = schema;

  if (fix.action === "replace-tool-description") {
    tool.description = reviewDescription(tool.name);
    return {
      ruleId: fix.ruleId,
      tool: fix.tool,
      action: fix.action,
      path: `tools[${toolIndex}].description`,
      value: tool.description,
      requiresReview: true
    };
  }

  if (fix.action === "add-confirmation-property") {
    schema.properties.dry_run ??= {
      type: "boolean",
      description: confirmationDescription(tool.name),
      default: true
    };
    return {
      ruleId: fix.ruleId,
      tool: fix.tool,
      action: fix.action,
      path: `tools[${toolIndex}].inputSchema.properties.dry_run`,
      value: schema.properties.dry_run,
      requiresReview: true
    };
  }

  if (fix.action === "add-property-description" && fix.property && schema.properties[fix.property]) {
    schema.properties[fix.property].description = reviewPropertyDescription(fix.property);
    return {
      ruleId: fix.ruleId,
      tool: fix.tool,
      property: fix.property,
      action: fix.action,
      path: `tools[${toolIndex}].inputSchema.properties.${fix.property}.description`,
      value: schema.properties[fix.property].description,
      requiresReview: true
    };
  }

  return null;
}

export function previewFixes(manifest) {
  const preview = cloneJson(manifest);
  const tools = normalizeNativeTools(manifest);
  const issues = tools.flatMap((tool) => scanTool(tool).issues);
  const { fixes, manualReview } = planFixes(issues);
  const changed = fixes.map((fix) => applyFix(preview, fix)).filter(Boolean);

  return {
    changed,
    manualReview,
    preview
  };
}
