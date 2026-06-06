#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const VERSION = "0.1.0";
const DANGEROUS_TOOL_PATTERN =
  /\b(delete|remove|destroy|drop|purge|overwrite|write|send|email|charge|pay|deploy|execute|exec|run|shell)\b/i;

function usage() {
  return `mcp-autofix-bot ${VERSION}

Usage:
  mcp-autofix-bot scan <tools.json> [--json] [--output report.json]
  mcp-autofix-bot pr <report.json> --dry-run

Examples:
  mcp-autofix-bot scan examples/bad-mcp-server/tools.json --json
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

    if (arg === "--json" || arg === "--dry-run" || arg === "--help") {
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

function normalizeTools(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.tools)) {
    return payload.tools;
  }

  if (payload.result && Array.isArray(payload.result.tools)) {
    return payload.result.tools;
  }

  throw new Error("Expected a JSON array, { tools: [...] }, or MCP tools/list result.");
}

function isVagueDescription(description) {
  if (typeof description !== "string") {
    return true;
  }

  const trimmed = description.trim();
  return trimmed.length < 40 || !/[.!?]$/.test(trimmed);
}

function hasConfirmationProperty(schema = {}) {
  const properties = schema.properties ?? {};
  return Object.entries(properties).some(([name, property]) => {
    const description = String(property?.description ?? "");
    return /confirm|approval|dry[- ]?run|preview/i.test(`${name} ${description}`);
  });
}

function scanTool(tool) {
  const issues = [];
  const fixes = [];
  const schema = tool.inputSchema ?? {};
  const properties = schema.properties ?? {};

  if (isVagueDescription(tool.description)) {
    issues.push({
      ruleId: "tool-description-vague",
      severity: "warning",
      tool: tool.name,
      message: "Tool description is too short or lacks a clear sentence boundary."
    });
    fixes.push({
      tool: tool.name,
      title: "Clarify tool purpose and safe-use boundaries",
      patchHint:
        "Expand the description with the operation scope, side effects, failure modes, and user-visible result."
    });
  }

  if (DANGEROUS_TOOL_PATTERN.test(`${tool.name ?? ""} ${tool.description ?? ""}`) && !hasConfirmationProperty(schema)) {
    issues.push({
      ruleId: "dangerous-tool-needs-confirmation",
      severity: "error",
      tool: tool.name,
      message: "Potentially destructive or side-effectful tool does not expose a confirmation, preview, or dry-run field."
    });
    fixes.push({
      tool: tool.name,
      title: "Require confirmation or dry-run for side-effectful action",
      patchHint:
        "Add a confirmation, preview, or dry_run field and describe when callers must use it before execution."
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
      fixes.push({
        tool: tool.name,
        title: `Describe input property "${propertyName}"`,
        patchHint:
          "Add a concise property description that states format, constraints, examples, and whether the value is user-controlled."
      });
    }
  }

  return { issues, fixes };
}

function buildReport(sourcePath, tools) {
  const scannedAt = new Date().toISOString();
  const results = tools.map(scanTool);
  const issues = results.flatMap((result) => result.issues);
  const fixes = results.flatMap((result) => result.fixes);
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
    fixes
  };
}

async function commandScan(args) {
  const { flags, positionals } = parseFlags(args);
  const inputPath = positionals[0];

  if (!inputPath || flags.get("--help")) {
    process.stdout.write(usage());
    return;
  }

  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  const tools = normalizeTools(payload);
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

  if (!flags.has("--dry-run")) {
    throw new Error("The v0 scaffold only supports `pr --dry-run`.");
  }

  const report = JSON.parse(await readFile(reportPath, "utf8"));
  const fixes = report.fixes ?? [];
  const lines = [
    `Dry run: would open a PR with ${fixes.length} proposed fixes.`,
    "",
    "Proposed PR title:",
    "Improve MCP tool schemas and descriptions for safer agent use",
    "",
    "Fix summary:"
  ];

  for (const fix of fixes) {
    lines.push(`- ${fix.tool}: ${fix.title}`);
  }

  process.stdout.write(`${lines.join("\n")}\n`);
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
