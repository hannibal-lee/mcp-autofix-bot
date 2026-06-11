#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { planFixes } from "./fix-planner.js";
import { createPullRequest } from "./github.js";
import { previewFixes } from "./patch-writer.js";
import { buildPrDraft } from "./pr-draft.js";
import { normalizeExternalReport, normalizeNativeTools } from "./report-readers.js";
import { scanTool } from "./rules.js";

const VERSION = "0.1.0";

function usage() {
  return `mcp-autofix-bot ${VERSION}

Usage:
  mcp-autofix-bot scan <tools.json> [--json] [--output report.json]
  mcp-autofix-bot fix <tools.json> --dry-run [--json]
  mcp-autofix-bot pr <report.json> (--dry-run | --create)

Examples:
  mcp-autofix-bot scan examples/bad-mcp-server/tools.json --json
  mcp-autofix-bot fix examples/bad-mcp-server/tools.json --dry-run --json
  mcp-autofix-bot pr examples/reports/sample-scan-report.json --dry-run
`;
}

function parseFlags(args) {
  const flags = new Map();
  const positionals = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    if (arg === "--json" || arg === "--dry-run" || arg === "--create" || arg === "--help") {
      flags.set(arg, true);
      continue;
    }

    if (arg === "--output") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--output requires a file path.");
      }
      flags.set(arg, value);
      index += 1;
      continue;
    }

    throw new Error(`Unknown flag: ${arg}`);
  }

  return { flags, positionals };
}

function buildReport(sourcePath, tools) {
  const scannedAt = new Date().toISOString();
  const results = tools.map(scanTool);
  const issues = results.flatMap((result) => result.issues);
  const { fixes, manualReview } = planFixes(issues);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;

  return {
    tool: "mcp-autofix-bot",
    version: VERSION,
    source: basename(sourcePath),
    scannedAt,
    summary: {
      status: issues.length === 0 ? "pass" : "fail",
      toolCount: tools.length,
      issueCount: issues.length,
      errorCount,
      warningCount: issues.length - errorCount
    },
    issues,
    fixes,
    manualReview
  };
}

function buildReportFromExternal(sourcePath, payload) {
  const normalized = normalizeExternalReport(payload);
  const issues = normalized.issues;
  const { fixes, manualReview } = planFixes(issues);
  const errorCount = issues.filter((issue) => issue.severity === "error").length;

  return {
    tool: "mcp-autofix-bot",
    version: VERSION,
    source: basename(sourcePath),
    sourceTool: normalized.sourceTool,
    summary: {
      status: issues.length === 0 ? "pass" : "fail",
      issueCount: issues.length,
      errorCount,
      warningCount: issues.length - errorCount
    },
    issues,
    fixes,
    manualReview
  };
}

function normalizeReportForPr(sourcePath, payload) {
  if (payload?.tool === "mcp-autofix-bot" || Array.isArray(payload?.fixes) || Array.isArray(payload?.manualReview)) {
    return payload;
  }

  return buildReportFromExternal(sourcePath, payload);
}

async function commandScan(args) {
  const { flags, positionals } = parseFlags(args);
  const inputPath = positionals[0];

  if (!inputPath || flags.get("--help")) {
    process.stdout.write(usage());
    return;
  }

  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  const tools = normalizeNativeTools(payload);
  const report = buildReport(inputPath, tools);
  const output = JSON.stringify(report, null, 2);

  if (flags.has("--output")) {
    await writeFile(flags.get("--output"), `${output}\n`);
  }

  if (flags.has("--json")) {
    process.stdout.write(`${output}\n`);
    return;
  }

  process.stdout.write(
    `${report.summary.status.toUpperCase()}: scanned ${report.summary.toolCount} tools, found ${report.summary.issueCount} issues.\n`
  );
}

async function commandPr(args) {
  const { flags, positionals } = parseFlags(args);
  const reportPath = positionals[0];

  if (!reportPath || flags.get("--help")) {
    process.stdout.write(usage());
    return;
  }

  if (Number(flags.has("--dry-run")) + Number(flags.has("--create")) !== 1) {
    throw new Error("Choose exactly one PR mode: --dry-run or --create.");
  }

  const payload = JSON.parse(await readFile(reportPath, "utf8"));
  const report = normalizeReportForPr(reportPath, payload);
  const fixes = report.fixes ?? [];
  const draft = buildPrDraft(report);

  if (flags.has("--create")) {
    const result = await createPullRequest(draft);
    process.stdout.write(`Created pull request: ${result.url}\n`);
    return;
  }

  const lines = [
    `Dry run: would open a PR with ${fixes.length} proposed fixes.`,
    "",
    `Title: ${draft.title}`,
    "",
    draft.body
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

async function commandFix(args) {
  const { flags, positionals } = parseFlags(args);
  const inputPath = positionals[0];

  if (!inputPath || flags.get("--help")) {
    process.stdout.write(usage());
    return;
  }

  if (!flags.has("--dry-run")) {
    throw new Error("The fix command only supports --dry-run previews.");
  }

  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  const result = previewFixes(payload);
  const output = JSON.stringify(result, null, 2);

  if (flags.has("--json")) {
    process.stdout.write(`${output}\n`);
    return;
  }

  process.stdout.write(`Dry run: previewed ${result.changed.length} JSON changes without writing files.\n`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  if (command === "scan") {
    await commandScan(args);
    return;
  }

  if (command === "fix") {
    await commandFix(args);
    return;
  }

  if (command === "pr") {
    await commandPr(args);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
