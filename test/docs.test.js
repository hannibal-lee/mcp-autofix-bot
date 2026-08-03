import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import test from "node:test";

const root = new URL("..", import.meta.url).pathname;
const publicRoots = ["README.md", "CONTRIBUTING.md", "package.json", ".github", "docs", "examples"];
const publicExtensions = new Set([".md", ".json", ".yml", ".yaml"]);
const chineseTextPattern = /[\u3400-\u9fff\uf900-\ufaff]/u;

function hasPublicExtension(path) {
  return [...publicExtensions].some((extension) => path.endsWith(extension));
}

async function listPublicFiles(entry) {
  const path = join(root, entry);
  if (hasPublicExtension(path)) {
    return [path];
  }

  const files = [];
  for (const child of await readdir(path, { withFileTypes: true })) {
    const childPath = join(entry, child.name);
    if (child.isDirectory()) {
      files.push(...(await listPublicFiles(childPath)));
    } else if (hasPublicExtension(childPath)) {
      files.push(join(root, childPath));
    }
  }
  return files;
}

async function readProjectFile(path) {
  return readFile(join(root, path), "utf8");
}

test("public documentation and examples remain English-only", async () => {
  const files = (await Promise.all(publicRoots.map(listPublicFiles))).flat();
  const filesWithChineseText = [];

  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (chineseTextPattern.test(content)) {
      filesWithChineseText.push(relative(root, file));
    }
  }

  assert.deepEqual(filesWithChineseText, []);
});

test("README documents implemented scan, fix, and PR modes", async () => {
  const readme = await readProjectFile("README.md");

  assert.match(readme, /mcp-autofix-bot scan <tools\.json> \[--stable\] \[--json\] \[--output report\.json\]/);
  assert.match(readme, /mcp-autofix-bot fix <tools\.json> --dry-run \[--json\]/);
  assert.match(readme, /mcp-autofix-bot pr <report\.json> \(--dry-run \| --create\)/);
});

test("workflow and release checklist include dry-run fix previews", async () => {
  const workflow = await readProjectFile(".github/workflows/mcp-autofix.yml");
  const checklist = await readProjectFile("docs/release-checklist.md");

  assert.match(workflow, /mcp-autofix-bot fix examples\/bad-mcp-server\/tools\.json --dry-run --json/);
  assert.match(checklist, /`npm run fix` previews review-marked JSON changes/);
});

test("scheduled workflow creates change-only report PRs against the default branch", async () => {
  const workflow = await readProjectFile(".github/workflows/scheduled-mcp-scan.yml");

  assert.match(workflow, /cron: "17 1 \* \* 1-5"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /contents: write/);
  assert.match(workflow, /pull-requests: write/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(workflow, /scan examples\/bad-mcp-server\/tools\.json --stable --output reports\/scheduled-scan\.json/);
  assert.match(workflow, /peter-evans\/create-pull-request@5f6978faf089d4d20b00c7766989d076bb2fc7f1/);
  assert.match(workflow, /base: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(workflow, /branch: automation\/scheduled-mcp-scan/);
  assert.match(workflow, /author: github-actions\[bot\]/);
  assert.match(workflow, /committer: github-actions\[bot\]/);
});
