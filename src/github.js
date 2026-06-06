import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function buildGhPrCreateArgs(draft) {
  return ["pr", "create", "--title", draft.title, "--body", draft.body];
}

export async function createPullRequest(draft, runner = execFileAsync) {
  const args = buildGhPrCreateArgs(draft);
  const { stdout, stderr } = await runner("gh", args);
  const output = String(stdout || stderr || "").trim();

  return {
    command: "gh",
    args,
    url: output
  };
}
