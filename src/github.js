import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function buildGhPrCreateArgs(draft) {
  return ["pr", "create", "--title", draft.title, "--body", draft.body];
}

async function runGit(args, runner) {
  const { stdout } = await runner("git", args);
  return String(stdout ?? "").trim();
}

async function currentBranch(runner) {
  return runGit(["branch", "--show-current"], runner);
}

async function defaultBranch(runner) {
  try {
    const remoteHead = await runGit(["symbolic-ref", "refs/remotes/origin/HEAD", "--short"], runner);
    return remoteHead.replace(/^origin\//, "");
  } catch {
    return "main";
  }
}

async function hasCleanWorkingTree(runner) {
  return (await runGit(["status", "--short"], runner)) === "";
}

async function hasCommitsSinceDefaultBranch(branch, runner) {
  const count = await runGit(["rev-list", "--count", `origin/${branch}..HEAD`], runner);
  return Number(count) > 0;
}

export async function assertReadyToCreatePullRequest(runner = execFileAsync) {
  const branch = await currentBranch(runner);
  if (!branch) {
    throw new Error("Cannot create a pull request from a detached HEAD.");
  }

  const baseBranch = await defaultBranch(runner);
  if (branch === baseBranch) {
    throw new Error(`Refusing to create a pull request from the default branch "${baseBranch}". Create a feature branch with committed fixes first.`);
  }

  if (!(await hasCleanWorkingTree(runner))) {
    throw new Error("Refusing to create a pull request with uncommitted changes. Commit the reviewed fixes first.");
  }

  if (!(await hasCommitsSinceDefaultBranch(baseBranch, runner))) {
    throw new Error(`Refusing to create an empty pull request. Commit changes on "${branch}" before running --create.`);
  }

  return { branch, baseBranch };
}

export async function createPullRequest(draft, runner = execFileAsync) {
  await assertReadyToCreatePullRequest(runner);
  const args = buildGhPrCreateArgs(draft);
  const { stdout, stderr } = await runner("gh", args);
  const output = String(stdout || stderr || "").trim();

  return {
    command: "gh",
    args,
    url: output
  };
}
