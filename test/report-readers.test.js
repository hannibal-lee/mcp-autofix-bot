import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeExternalReport, normalizeNativeTools } from "../src/report-readers.js";

async function readFixture(name) {
  const fixtureUrl = new URL(`../examples/fixtures/${name}`, import.meta.url);
  return JSON.parse(await readFile(fixtureUrl, "utf8"));
}

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

test("normalizeExternalReport adapts mcp-lint issues", async () => {
  const report = normalizeExternalReport(await readFixture("mcp-lint-report.json"));

  assert.equal(report.sourceTool, "mcp-lint");
  assert.deepEqual(
    report.issues.map((issue) => ({
      ruleId: issue.ruleId,
      severity: issue.severity,
      tool: issue.tool,
      property: issue.property,
      source: issue.source
    })),
    [
      {
        ruleId: "tool-description-vague",
        severity: "warning",
        tool: "delete_file",
        property: undefined,
        source: "mcp-lint"
      },
      {
        ruleId: "property-description-missing",
        severity: "warning",
        tool: "delete_file",
        property: "path",
        source: "mcp-lint"
      }
    ]
  );
});

test("normalizeExternalReport adapts failing mcp-assert results", async () => {
  const report = normalizeExternalReport(await readFixture("mcp-assert-report.json"));

  assert.equal(report.sourceTool, "mcp-assert");
  assert.deepEqual(
    report.issues.map((issue) => ({
      ruleId: issue.ruleId,
      severity: issue.severity,
      tool: issue.tool,
      message: issue.message,
      source: issue.source
    })),
    [
      {
        ruleId: "mcp-assert/dangerous-tools-expose-confirmation-semantics",
        severity: "error",
        tool: "delete_file",
        message: "delete_file can remove user data without a confirmation field.",
        source: "mcp-assert"
      }
    ]
  );
});

test("normalizeExternalReport adapts mcpdiff changes", async () => {
  const report = normalizeExternalReport(await readFixture("mcpdiff-report.json"));

  assert.equal(report.sourceTool, "mcpdiff");
  assert.deepEqual(
    report.issues.map((issue) => ({
      ruleId: issue.ruleId,
      severity: issue.severity,
      tool: issue.tool,
      property: issue.property,
      path: issue.path,
      source: issue.source
    })),
    [
      {
        ruleId: "mcpdiff/changed",
        severity: "warning",
        tool: "delete_file",
        property: "path",
        path: "tools.delete_file.inputSchema.properties.path.description",
        source: "mcpdiff"
      },
      {
        ruleId: "mcpdiff/removed",
        severity: "error",
        tool: "deploy_app",
        property: "dry_run",
        path: "tools.deploy_app.inputSchema.properties.dry_run",
        source: "mcpdiff"
      }
    ]
  );
});

test("normalizeExternalReport rejects unknown report shapes", () => {
  assert.throws(
    () => normalizeExternalReport({ tool: "unknown", records: [] }),
    /Expected an mcp-lint, mcp-assert, or mcpdiff report/
  );
});
