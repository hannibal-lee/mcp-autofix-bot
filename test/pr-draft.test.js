import assert from "node:assert/strict";
import test from "node:test";
import { buildPrDraft } from "../src/pr-draft.js";

test("buildPrDraft creates maintainer-friendly title and body", () => {
  const draft = buildPrDraft({
    summary: {
      issueCount: 3,
      errorCount: 1,
      warningCount: 2
    },
    fixes: [
      {
        tool: "delete_file",
        title: "Clarify tool purpose and safe-use boundaries",
        action: "replace-tool-description",
        requiresReview: true
      },
      {
        tool: "delete_file",
        property: "path",
        title: "Describe input property \"path\"",
        action: "add-property-description",
        requiresReview: true
      }
    ],
    manualReview: [
      {
        tool: "deploy_app",
        ruleId: "mcpdiff/removed",
        message: "dry_run was removed from deploy_app."
      }
    ]
  });

  assert.equal(draft.title, "Improve MCP tool schemas for clearer agent use");
  assert.match(draft.body, /This PR improves MCP tool schema clarity/);
  assert.match(draft.body, /- `delete_file`: Clarify tool purpose and safe-use boundaries/);
  assert.match(draft.body, /- `delete_file.path`: Describe input property "path"/);
  assert.match(draft.body, /Manual review still required/);
  assert.match(draft.body, /mcpdiff\/removed/);
  assert.match(draft.body, /This does not claim the server is safe/);
});

test("buildPrDraft handles reports without fixes", () => {
  const draft = buildPrDraft({
    summary: {
      issueCount: 0,
      errorCount: 0,
      warningCount: 0
    },
    fixes: [],
    manualReview: []
  });

  assert.match(draft.body, /No deterministic fixes were planned/);
});

test("buildPrDraft includes external source report names", () => {
  const draft = buildPrDraft({
    sourceTool: "mcp-lint",
    summary: {
      issueCount: 1,
      errorCount: 0,
      warningCount: 1
    },
    fixes: [],
    manualReview: []
  });

  assert.match(draft.body, /Source report: mcp-lint/);
});
