// scripts/git-commit.mjs <message> [--allow-empty]
// Stage all changes (respecting .gitignore) and commit with the given message.
// Uses isomorphic-git, works in userland without the system `git` binary.
import fs from "node:fs";
import path from "node:path";
import git from "isomorphic-git";

const DIR = "/Users/Guest/Desktop/cmr";
const AUTHOR = { name: "MAMAOUTALIBE", email: "contact@gmd2025.org" };

const args = process.argv.slice(2);
const message = args.find((a) => !a.startsWith("--"));
if (!message) {
  console.error("Usage: node scripts/git-commit.mjs <message>");
  process.exit(1);
}

async function loadIgnore() {
  try {
    const content = await fs.promises.readFile(path.join(DIR, ".gitignore"), "utf8");
    return content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
  } catch {
    return [];
  }
}

function matchesPattern(filePath, pattern) {
  // very small subset: support exact-name, /prefix, suffix*, **/x, x/**, plus wildcards
  let p = pattern;
  const negate = p.startsWith("!");
  if (negate) p = p.slice(1);
  // normalize
  if (p.startsWith("/")) p = p.slice(1);
  // turn glob into regex
  const re = new RegExp(
    "^" +
      p
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "§§§")
        .replace(/\*/g, "[^/]*")
        .replace(/§§§/g, ".*")
        .replace(/\?/g, "[^/]") +
      "(/.*)?$",
  );
  return { match: re.test(filePath) || re.test(path.basename(filePath)), negate };
}

function isIgnored(filePath, patterns) {
  let ignored = false;
  for (const pat of patterns) {
    const { match, negate } = matchesPattern(filePath, pat);
    if (match) ignored = !negate;
  }
  return ignored;
}

async function run() {
  const ignore = await loadIgnore();
  const matrix = await git.statusMatrix({ fs, dir: DIR });
  // matrix entry: [filepath, HEAD, WORKDIR, STAGE]
  // We want everything where WORKDIR != HEAD (modified, new) or STAGE != HEAD
  let staged = 0;
  let removed = 0;
  for (const [filepath, head, workdir, stage] of matrix) {
    if (isIgnored(filepath, ignore)) continue;
    if (head === 1 && workdir === 0 && stage === 1) {
      // deleted in workdir
      await git.remove({ fs, dir: DIR, filepath });
      removed++;
      continue;
    }
    if (workdir !== stage) {
      await git.add({ fs, dir: DIR, filepath });
      staged++;
    }
  }
  if (staged === 0 && removed === 0 && !args.includes("--allow-empty")) {
    console.log("(nothing to commit)");
    return;
  }
  const sha = await git.commit({
    fs,
    dir: DIR,
    author: AUTHOR,
    message,
  });
  console.log(`✓ commit ${sha.slice(0, 10)} — ${staged} staged, ${removed} removed`);
  console.log(`  "${message}"`);
}

run().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
