import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNativeTools } from "../src/report-readers.js";

test("normalizeNativeTools accepts MCP tools/list result payloads", () => {
  const tools = normalizeNativeTools({
    result: {
      tools: [
        {
          name: "delete_file",
          description: "Delete file",
          inputSchema: { type: "object", properties: {} }
        }
      ]
    }
  });

  assert.equal(tools.length, 1);
  assert.equal(tools[0].name, "delete_file");
});

test("normalizeNativeTools rejects payloads without tools", () => {
  assert.throws(
    () => normalizeNativeTools({ result: { resources: [] } }),
    /Expected a JSON array, \{ tools: \[\.\.\.\] \}, or MCP tools\/list result/
  );
});
