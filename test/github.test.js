import assert from "node:assert/strict";
import test from "node:test";
import { buildGhPrCreateArgs, createPullRequest } from "../src/github.js";

test("buildGhPrCreateArgs constructs safe gh pr create arguments", () => {
  const args = buildGhPrCreateArgs({
    title: "Improve MCP tool schemas for clearer agent use",
    body: "Review this schema-quality change."
  });

  assert.deepEqual(args, [
    "pr",
    "create",
    "--title",
    "Improve MCP tool schemas for clearer agent use",
    "--body",
    "Review this schema-quality change."
  ]);
});

test("createPullRequest calls the injected runner without shell interpolation", async () => {
  const calls = [];
  const result = await createPullRequest(
    {
      title: "Improve MCP tool schemas for clearer agent use",
      body: "Review this schema-quality change."
    },
    async (command, args) => {
      calls.push({ command, args });
      return {
        stdout: "https://github.com/example/repo/pull/1\n",
        stderr: ""
      };
    }
  );

  assert.deepEqual(calls, [
    {
      command: "gh",
      args: [
        "pr",
        "create",
        "--title",
        "Improve MCP tool schemas for clearer agent use",
        "--body",
        "Review this schema-quality change."
      ]
    }
  ]);
  assert.equal(result.url, "https://github.com/example/repo/pull/1");
});
