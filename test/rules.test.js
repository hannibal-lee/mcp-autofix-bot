import assert from "node:assert/strict";
import test from "node:test";
import { scanTool } from "../src/rules.js";

test("scanTool flags vague descriptions, dangerous tools, and missing property descriptions", () => {
  const result = scanTool({
    name: "delete_file",
    description: "Delete file",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" }
      }
    }
  });

  assert.deepEqual(
    result.issues.map((issue) => issue.ruleId),
    ["tool-description-vague", "dangerous-tool-needs-confirmation", "property-description-missing"]
  );
  assert.equal(result.fixes, undefined);
});

test("scanTool stays quiet for clear read-only tools", () => {
  const result = scanTool({
    name: "search_docs",
    description: "Search indexed project documentation and return ranked snippets with source paths.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Natural-language search query."
        }
      },
      required: ["query"]
    }
  });

  assert.equal(result.issues.length, 0);
});

test("scanTool does not treat unrelated preview fields as confirmation", () => {
  const result = scanTool({
    name: "delete_file",
    description: "Delete a file from disk after the caller chooses a target path.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Filesystem path to delete."
        },
        preview_url: {
          type: "string",
          description: "URL for a preview image shown in the UI."
        }
      },
      required: ["path"]
    }
  });

  assert.deepEqual(
    result.issues.map((issue) => issue.ruleId),
    ["dangerous-tool-needs-confirmation"]
  );
});

test("scanTool accepts explicit boolean confirmation fields", () => {
  const result = scanTool({
    name: "delete_file",
    description: "Delete a file from disk after the caller chooses a target path.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Filesystem path to delete."
        },
        confirm: {
          type: "boolean",
          description: "Set to true only after reviewing the deletion."
        }
      },
      required: ["path", "confirm"]
    }
  });

  assert.equal(result.issues.length, 0);
});
