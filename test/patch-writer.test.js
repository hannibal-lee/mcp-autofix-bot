import assert from "node:assert/strict";
import test from "node:test";
import { previewFixes } from "../src/patch-writer.js";

test("previewFixes creates review-marked JSON changes without mutating the input", () => {
  const manifest = {
    tools: [
      {
        name: "delete_file",
        description: "Delete file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string" }
          },
          required: ["path"]
        }
      }
    ]
  };

  const result = previewFixes(manifest);

  assert.equal(result.changed.length, 3);
  assert.deepEqual(
    result.changed.map((change) => ({
      action: change.action,
      path: change.path,
      requiresReview: change.requiresReview
    })),
    [
      {
        action: "replace-tool-description",
        path: "tools[0].description",
        requiresReview: true
      },
      {
        action: "add-confirmation-property",
        path: "tools[0].inputSchema.properties.confirm",
        requiresReview: true
      },
      {
        action: "add-property-description",
        path: "tools[0].inputSchema.properties.path.description",
        requiresReview: true
      }
    ]
  );
  assert.match(result.preview.tools[0].description, /^\[REVIEW REQUIRED\]/);
  assert.match(result.preview.tools[0].inputSchema.properties.path.description, /REVIEW REQUIRED/);
  assert.equal(result.preview.tools[0].inputSchema.properties.confirm.type, "boolean");
  assert.equal(result.preview.tools[0].inputSchema.properties.confirm.default, false);
  assert.equal(manifest.tools[0].description, "Delete file");
  assert.equal(manifest.tools[0].inputSchema.properties.path.description, undefined);
});

test("previewFixes reports paths relative to array manifests", () => {
  const manifest = [
    {
      name: "delete_file",
      description: "Delete file",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string" }
        }
      }
    }
  ];

  const result = previewFixes(manifest);

  assert.deepEqual(
    result.changed.map((change) => change.path),
    [
      "[0].description",
      "[0].inputSchema.properties.confirm",
      "[0].inputSchema.properties.path.description"
    ]
  );
});

test("previewFixes reports paths relative to MCP tools/list results", () => {
  const manifest = {
    result: {
      tools: [
        {
          name: "delete_file",
          description: "Delete file",
          inputSchema: {
            type: "object",
            properties: {
              path: { type: "string" }
            }
          }
        }
      ]
    }
  };

  const result = previewFixes(manifest);

  assert.deepEqual(
    result.changed.map((change) => change.path),
    [
      "result.tools[0].description",
      "result.tools[0].inputSchema.properties.confirm",
      "result.tools[0].inputSchema.properties.path.description"
    ]
  );
});

test("previewFixes reports no changes for clear tool manifests", () => {
  const manifest = {
    tools: [
      {
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
      }
    ]
  };

  const result = previewFixes(manifest);

  assert.deepEqual(result.changed, []);
  assert.deepEqual(result.preview, manifest);
});
