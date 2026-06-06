import assert from "node:assert/strict";
import test from "node:test";
import { planFixes } from "../src/fix-planner.js";

test("planFixes converts deterministic native issues into fix plans", () => {
  const result = planFixes([
    {
      ruleId: "tool-description-vague",
      severity: "warning",
      tool: "delete_file",
      message: "Tool description is too short or lacks a clear sentence boundary."
    },
    {
      ruleId: "dangerous-tool-needs-confirmation",
      severity: "error",
      tool: "delete_file",
      message: "Potentially destructive or side-effectful tool does not expose a confirmation, preview, or dry-run field."
    },
    {
      ruleId: "property-description-missing",
      severity: "warning",
      tool: "delete_file",
      property: "path",
      message: "Input property \"path\" is missing a description."
    }
  ]);

  assert.deepEqual(
    result.fixes.map((fix) => ({
      ruleId: fix.ruleId,
      tool: fix.tool,
      property: fix.property,
      action: fix.action,
      requiresReview: fix.requiresReview
    })),
    [
      {
        ruleId: "tool-description-vague",
        tool: "delete_file",
        property: undefined,
        action: "replace-tool-description",
        requiresReview: true
      },
      {
        ruleId: "dangerous-tool-needs-confirmation",
        tool: "delete_file",
        property: undefined,
        action: "add-confirmation-property",
        requiresReview: true
      },
      {
        ruleId: "property-description-missing",
        tool: "delete_file",
        property: "path",
        action: "add-property-description",
        requiresReview: true
      }
    ]
  );
  assert.equal(result.manualReview.length, 0);
});

test("planFixes routes unsupported and external issues to manual review", () => {
  const result = planFixes([
    {
      ruleId: "mcpdiff/removed",
      severity: "error",
      tool: "deploy_app",
      property: "dry_run",
      source: "mcpdiff",
      message: "dry_run was removed from deploy_app."
    }
  ]);

  assert.equal(result.fixes.length, 0);
  assert.deepEqual(result.manualReview, [
    {
      ruleId: "mcpdiff/removed",
      severity: "error",
      tool: "deploy_app",
      property: "dry_run",
      source: "mcpdiff",
      message: "dry_run was removed from deploy_app.",
      reason: "No deterministic autofix is available for this issue."
    }
  ]);
});
