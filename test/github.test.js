import assert from "node:assert/strict";
import test from "node:test";
import { assertReadyToCreatePullRequest, buildGhPrCreateArgs, createPullRequest } from "../src/github.js";

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

test("assertReadyToCreatePullRequest requires a clean feature branch with commits", async () => {
  const calls = [];
  const result = await assertReadyToCreatePullRequest(async (command, args) => {
    calls.push({ command, args });
    if (args[0] === "branch") {
      return { stdout: "fix/schema-preview\n" };
    }
    if (args[0] === "symbolic-ref") {
      return { stdout: "origin/main\n" };
    }
    if (args[0] === "status") {
      return { stdout: "" };
    }
    if (args[0] === "rev-parse") {
      return { stdout: "abc123\n" };
    }
    if (args[0] === "rev-list") {
      return { stdout: "2\n" };
    }
    throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
  });

  assert.deepEqual(result, { branch: "fix/schema-preview", baseBranch: "main" });
  assert.equal(calls.length, 5);
});

test("assertReadyToCreatePullRequest rejects the default branch", async () => {
  await assert.rejects(
    assertReadyToCreatePullRequest(async (command, args) => {
      if (args[0] === "branch") {
        return { stdout: "main\n" };
      }
      if (args[0] === "symbolic-ref") {
        return { stdout: "origin/main\n" };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
    }),
    /Refusing to create a pull request from the default branch/
  );
});

test("assertReadyToCreatePullRequest rejects uncommitted changes", async () => {
  await assert.rejects(
    assertReadyToCreatePullRequest(async (command, args) => {
      if (args[0] === "branch") {
        return { stdout: "fix/schema-preview\n" };
      }
      if (args[0] === "symbolic-ref") {
        return { stdout: "origin/main\n" };
      }
      if (args[0] === "status") {
        return { stdout: " M tools.json\n" };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
    }),
    /uncommitted changes/
  );
});

test("assertReadyToCreatePullRequest rejects branches without new commits", async () => {
  await assert.rejects(
    assertReadyToCreatePullRequest(async (command, args) => {
      if (args[0] === "branch") {
        return { stdout: "fix/schema-preview\n" };
      }
      if (args[0] === "symbolic-ref") {
        return { stdout: "origin/main\n" };
      }
      if (args[0] === "status") {
        return { stdout: "" };
      }
      if (args[0] === "rev-parse") {
        return { stdout: "abc123\n" };
      }
      if (args[0] === "rev-list") {
        return { stdout: "0\n" };
      }
      throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
    }),
    /empty pull request/
  );
});

test("assertReadyToCreatePullRequest reports missing remote default branches clearly", async () => {
  await assert.rejects(
    assertReadyToCreatePullRequest(async (command, args) => {
      if (args[0] === "branch") {
        return { stdout: "fix/schema-preview\n" };
      }
      if (args[0] === "symbolic-ref") {
        return { stdout: "origin/main\n" };
      }
      if (args[0] === "status") {
        return { stdout: "" };
      }
      if (args[0] === "rev-parse") {
        throw new Error("unknown revision");
      }
      throw new Error(`Unexpected command: ${command} ${args.join(" ")}`);
    }),
    /Cannot find remote default branch "origin\/main"/
  );
});

test("createPullRequest calls the injected runner without shell interpolation after safety checks", async () => {
  const calls = [];
  const result = await createPullRequest(
    {
      title: "Improve MCP tool schemas for clearer agent use",
      body: "Review this schema-quality change."
    },
    async (command, args) => {
      calls.push({ command, args });
      if (command === "git" && args[0] === "branch") {
        return { stdout: "fix/schema-preview\n", stderr: "" };
      }
      if (command === "git" && args[0] === "symbolic-ref") {
        return { stdout: "origin/main\n", stderr: "" };
      }
      if (command === "git" && args[0] === "status") {
        return { stdout: "", stderr: "" };
      }
      if (command === "git" && args[0] === "rev-parse") {
        return { stdout: "abc123\n", stderr: "" };
      }
      if (command === "git" && args[0] === "rev-list") {
        return { stdout: "1\n", stderr: "" };
      }
      return {
        stdout: "https://github.com/example/repo/pull/1\n",
        stderr: ""
      };
    }
  );

  assert.deepEqual(calls, [
    {
      command: "git",
      args: ["branch", "--show-current"]
    },
    {
      command: "git",
      args: ["symbolic-ref", "refs/remotes/origin/HEAD", "--short"]
    },
    {
      command: "git",
      args: ["status", "--short"]
    },
    {
      command: "git",
      args: ["rev-parse", "--verify", "origin/main"]
    },
    {
      command: "git",
      args: ["rev-list", "--count", "origin/main..HEAD"]
    },
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
