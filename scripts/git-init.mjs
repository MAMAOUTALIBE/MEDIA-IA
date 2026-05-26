// Userland git init / add / commit / branch / remote using isomorphic-git.
// macOS Guest account has no admin → no Xcode CLT → no /usr/bin/git available.
// This script reproduces the user-supplied sequence:
//   echo "# MEDIA-IA" >> README.md
//   git init
//   git add README.md
//   git commit -m "first commit"
//   git branch -M main
//   git remote add origin https://github.com/MAMAOUTALIBE/MEDIA-IA.git
//   git push -u origin main   <-- requires GitHub PAT, attempted with hint on failure
import fs from "node:fs";
import path from "node:path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";

const DIR = "/Users/Guest/Desktop/cmr";
const README = path.join(DIR, "README.md");

const AUTHOR = { name: "MAMAOUTALIBE", email: "contact@gmd2025.org" };
const REMOTE_URL = "https://github.com/MAMAOUTALIBE/MEDIA-IA.git";

function appendHeader() {
  fs.appendFileSync(README, "# MEDIA-IA\n");
  console.log("✓ README.md : '# MEDIA-IA' appended");
}

async function run() {
  appendHeader();

  await git.init({ fs, dir: DIR, defaultBranch: "main" });
  console.log("✓ git init");

  await git.add({ fs, dir: DIR, filepath: "README.md" });
  console.log("✓ git add README.md");

  const sha = await git.commit({
    fs,
    dir: DIR,
    author: AUTHOR,
    message: "first commit",
  });
  console.log(`✓ git commit "first commit" → ${sha.slice(0, 10)}`);

  // git branch -M main : ensure HEAD is main (defaultBranch did this; idempotent)
  const branch = await git.currentBranch({ fs, dir: DIR });
  console.log(`✓ git branch : ${branch}`);

  await git.addRemote({ fs, dir: DIR, remote: "origin", url: REMOTE_URL, force: true });
  console.log(`✓ git remote add origin ${REMOTE_URL}`);

  // Attempt push
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.log("");
    console.log("⚠ git push : SKIPPED — pas de credentials GitHub disponibles");
    console.log("");
    console.log("Pour pousser plus tard, deux options :");
    console.log("  1) Fournir un GitHub PAT (scope `repo`) en variable d'env :");
    console.log("     GITHUB_TOKEN=ghp_xxx node scripts/git-init.mjs --push-only");
    console.log("  2) Cloner le repo depuis un poste admin avec git/SSH configurés.");
    console.log("");
    console.log("État local : OK. Le repo est prêt, il manque uniquement le push initial.");
    return;
  }
  try {
    const result = await git.push({
      fs,
      http,
      dir: DIR,
      remote: "origin",
      ref: "main",
      onAuth: () => ({ username: AUTHOR.name, password: token }),
    });
    console.log("✓ git push -u origin main");
    console.log("  → " + JSON.stringify(result.ok ? "OK" : result));
  } catch (e) {
    console.log("✗ git push failed: " + e.message);
    if (/401|403|Authentication/i.test(e.message)) {
      console.log("  → PAT invalide ou scope insuffisant (besoin `repo`)");
    } else if (/404|Not Found/i.test(e.message)) {
      console.log("  → Repo distant introuvable : créer https://github.com/MAMAOUTALIBE/MEDIA-IA d'abord");
    }
  }
}

const pushOnly = process.argv.includes("--push-only");
if (pushOnly) {
  // Only the push step (assumes init/commit already done)
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN env var required");
    process.exit(1);
  }
  git
    .push({
      fs,
      http,
      dir: DIR,
      remote: "origin",
      ref: "main",
      onAuth: () => ({ username: AUTHOR.name, password: token }),
    })
    .then((r) => console.log("✓ pushed:", JSON.stringify(r)))
    .catch((e) => {
      console.error("✗ push:", e.message);
      process.exit(1);
    });
} else {
  run().catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  });
}
