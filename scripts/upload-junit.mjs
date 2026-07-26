// Upload a JUnit XML report to TestForge as a test run.
//
//   TF_API_URL=https://testforge.example TF_PROJECT=my-slug TF_API_KEY=… \
//     node scripts/upload-junit.mjs
//
// Framework-agnostic: anything that writes JUnit XML works (Playwright, pytest,
// Jest, Vitest). Node 18+ — uses built-in fetch, no dependencies.
import fs from "node:fs";
import os from "node:os";

const API = (process.env.TF_API_URL ?? "").replace(/\/+$/, "");
const PROJECT = process.env.TF_PROJECT ?? "";
const KEY = process.env.TF_API_KEY ?? "";
const FILE = process.env.TF_JUNIT ?? "e2e-results/junit.xml";
const ENV_NAME = process.env.TF_ENV || null;

const missing = [
  !API && "TF_API_URL (e.g. https://testforge.emha.space)",
  !PROJECT && "TF_PROJECT (the <slug> in /projects/<slug>)",
  !KEY && "TF_API_KEY (TestForge → Settings → API Keys)",
].filter(Boolean);

if (missing.length) {
  console.error("Missing required environment:");
  for (const m of missing) console.error(`  · ${m}`);
  process.exit(1);
}
if (!fs.existsSync(FILE)) {
  console.error(
    `JUnit file not found: ${FILE}\n` +
      "Run the suite first, or point TF_JUNIT at the reporter's output path."
  );
  process.exit(1);
}

// Where did this run come from? Shown on the run in TestForge so a CI result is
// never confused with someone's laptop. Override with TF_RUN_LABEL.
function detectOrigin() {
  if (process.env.TF_RUN_LABEL) return process.env.TF_RUN_LABEL;
  if (process.env.GITHUB_ACTIONS) {
    const ref = process.env.GITHUB_REF_NAME ?? "";
    return `CI · GitHub Actions${ref ? ` (${ref})` : ""}`;
  }
  if (process.env.CI) return "CI";
  const plat =
    { darwin: "macOS", linux: "Linux", win32: "Windows" }[process.platform] ??
    process.platform;
  return `Local · ${plat} (${os.hostname()})`;
}

// A run name that says what produced it, so the run list is readable at a
// glance: PR number when the trigger was a PR, else branch@sha.
function defaultRunName() {
  const pr = process.env.GITHUB_REF?.match(/^refs\/pull\/(\d+)\//)?.[1];
  if (pr) return `PR #${pr} · ${process.env.GITHUB_HEAD_REF ?? ""}`.trim();
  if (process.env.GITHUB_ACTIONS) {
    const sha = (process.env.GITHUB_SHA ?? "").slice(0, 7);
    return `${process.env.GITHUB_REF_NAME ?? "build"}${sha ? `@${sha}` : ""}`;
  }
  return `Run ${new Date().toISOString()}`;
}

const ORIGIN = detectOrigin();
const RUN_NAME = process.env.TF_RUN_NAME || defaultRunName();

const params = new URLSearchParams({
  project: PROJECT,
  name: RUN_NAME,
  source: process.env.TF_SOURCE ?? "junit",
  origin: ORIGIN,
});
if (ENV_NAME) params.set("env", ENV_NAME);

const res = await fetch(`${API}/api/v1/junit?${params}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/xml" },
  body: fs.readFileSync(FILE, "utf8"),
});
const data = await res.json().catch(() => ({}));

const listUnmatched = (items) => {
  for (const n of items) console.log(`    · ${n}`);
  console.log(
    `  Tip: match by giving the case the same title, or a TC-${PROJECT.toUpperCase()}-<n> id in the test name.`
  );
};

if (!res.ok) {
  console.error(
    `\n✗ Upload failed — HTTP ${res.status}${data.error ? `: ${data.error}` : ""}`
  );
  if (Array.isArray(data.unmatched) && data.unmatched.length) {
    console.error(
      `\n  ${data.unmatched.length} test(s) matched no case in project "${PROJECT}":`
    );
    listUnmatched(data.unmatched);
  }
  process.exit(1);
}

const s = data.summary ?? {};
const total = (s.passed ?? 0) + (s.failed ?? 0) + (s.skipped ?? 0);

console.log(`\n✓ Uploaded to TestForge — project "${PROJECT}"`);
console.log(`  Run name:  ${RUN_NAME}`);
console.log(`  Origin:    ${ORIGIN}`);
if (ENV_NAME) console.log(`  Env:       ${ENV_NAME}`);
if (data.runUrl) console.log(`  Run:       ${API}${data.runUrl}`);
console.log(
  `  Results:   ${s.passed ?? 0} passed · ${s.failed ?? 0} failed · ${s.skipped ?? 0} skipped  (${total} total)`
);
console.log(`  Matched:   ${data.matched ?? 0} case(s)`);

const unmatched = Array.isArray(data.unmatched) ? data.unmatched : [];
if (unmatched.length) {
  console.log(
    `  Unmatched: ${unmatched.length} test(s) — not recorded against any case:`
  );
  listUnmatched(unmatched);
} else {
  console.log(`  Unmatched: none — every test mapped to a case.`);
}
