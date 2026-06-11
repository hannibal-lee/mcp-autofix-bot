import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cliPath = new URL("../src/cli.js", import.meta.url).pathname;

async function runCli(args, options = {}) {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd,
    env: { ...process.env, NO_COLOR: "1" }
  });
}

test("scan reports vague tool descriptions and missing property descriptions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcp-autofix-test-"));
  const inputPath = join(dir, "tools.json");
  await writeFile(
    inputPath,
    JSON.stringify(
      {
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
      },
      null,
      2
    )
  );

  const { stdout } = await runCli(["scan", inputPath, "--json"], { cwd: dir });
  const report = JSON.parse(stdout);

  assert.equal(report.summary.toolCount, 1);
  assert.equal(report.summary.issueCount, 3);
  assert.equal(report.fixes.length, 3);
  assert.deepEqual(report.manualReview, []);
  assert.deepEqual(
    report.issues.map((issue) => issue.ruleId),
    ["tool-description-vague", "dangerous-tool-needs-confirmation", "property-description-missing"]
  );
});

test("scan can write a report file for CI artifacts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcp-autofix-test-"));
  const inputPath = join(dir, "tools.json");
  const reportPath = join(dir, "report.json");
  await writeFile(
    inputPath,
    JSON.stringify({
      tools: [
        {
          name: "search_docs",
          description: "Search indexed project documentation using a natural-language query.",
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
    })
  );

  await runCli(["scan", inputPath, "--json", "--output", reportPath], { cwd: dir });
  const report = JSON.parse(await readFile(reportPath, "utf8"));

  assert.equal(report.summary.issueCount, 0);
  assert.equal(report.summary.status, "pass");
});

test("pr command summarizes the dry-run pull request without touching remotes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcp-autofix-test-"));
  const reportPath = join(dir, "report.json");
  await writeFile(
    reportPath,
    JSON.stringify({
      summary: { issueCount: 2, status: "fail" },
      fixes: [
        { tool: "delete_file", title: "Clarify destructive behavior" },
        { tool: "delete_file", title: "Require confirmation flag" }
      ]
    })
  );

  const { stdout } = await runCli(["pr", reportPath, "--dry-run"], { cwd: dir });

  assert.match(stdout, /Dry run: would open a PR with 2 proposed fixes/);
  assert.match(stdout, /Title: Improve MCP tool schemas for clearer agent use/);
  assert.match(stdout, /This PR improves MCP tool schema clarity/);
  assert.match(stdout, /Clarify destructive behavior/);
  assert.match(stdout, /Require confirmation flag/);
});

test("pr command requires an explicit dry-run or create mode", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcp-autofix-test-"));
  const reportPath = join(dir, "report.json");
  await writeFile(reportPath, JSON.stringify({ summary: {}, fixes: [] }));

  await assert.rejects(
    runCli(["pr", reportPath], { cwd: dir }),
    /Choose exactly one PR mode: --dry-run or --create/
  );
});

test("pr command rejects dry-run and create together", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcp-autofix-test-"));
  const reportPath = join(dir, "report.json");
  await writeFile(reportPath, JSON.stringify({ summary: {}, fixes: [] }));

  await assert.rejects(
    runCli(["pr", reportPath, "--dry-run", "--create"], { cwd: dir }),
    /Choose exactly one PR mode: --dry-run or --create/
  );
});

test("fix dry-run prints a JSON preview without writing the source manifest", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcp-autofix-test-"));
  const inputPath = join(dir, "tools.json");
  await writeFile(
    inputPath,
    JSON.stringify(
      {
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
      },
      null,
      2
    )
  );

  const { stdout } = await runCli(["fix", inputPath, "--dry-run", "--json"], { cwd: dir });
  const result = JSON.parse(stdout);
  const sourceAfter = JSON.parse(await readFile(inputPath, "utf8"));

  assert.equal(result.changed.length, 3);
  assert.match(result.preview.tools[0].description, /^\[REVIEW REQUIRED\]/);
  assert.equal(result.preview.tools[0].inputSchema.properties.confirm.type, "boolean");
  assert.equal(result.preview.tools[0].inputSchema.properties.confirm.default, false);
  assert.equal(sourceAfter.tools[0].description, "Delete file");
});

test("fix command requires dry-run mode", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcp-autofix-test-"));
  const inputPath = join(dir, "tools.json");
  await writeFile(inputPath, JSON.stringify({ tools: [] }));

  await assert.rejects(
    runCli(["fix", inputPath], { cwd: dir }),
    /The fix command only supports --dry-run previews/
  );
});

test("pr command accepts supported external quality reports", async () => {
  const dir = await mkdtemp(join(tmpdir(), "mcp-autofix-test-"));
  const reportPath = join(dir, "mcp-lint-report.json");
  await writeFile(
    reportPath,
    JSON.stringify({
      tool: "mcp-lint",
      issues: [
        {
          ruleId: "tool-description-vague",
          severity: "warning",
          tool: "delete_file",
          message: "Tool description should explain side effects."
        }
      ]
    })
  );

  const { stdout } = await runCli(["pr", reportPath, "--dry-run"], { cwd: dir });

  assert.match(stdout, /Dry run: would open a PR with 0 proposed fixes/);
  assert.match(stdout, /Reported issues: 1/);
  assert.match(stdout, /Manual review still required/);
  assert.match(stdout, /mcp-lint/);
});
