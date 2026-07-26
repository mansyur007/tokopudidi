#!/usr/bin/env node
// Push a suite tree + test cases to TestForge (REST API v1).
// Usage: node push-cases.mjs --slug <project-slug> --file <dataset.json>
// Reads TESTFORGE_API_URL / TESTFORGE_API_KEY from process.env (load your .env
// first, e.g. `node --env-file=.env push-cases.mjs ...` on Node 20.6+).

import { readFile } from "node:fs/promises";

function parseArgs(argv) {
  const args = { slug: null, file: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--slug") args.slug = argv[++i];
    else if (argv[i] === "--file") args.file = argv[++i];
  }
  if (!args.slug || !args.file) {
    console.error("Usage: push-cases.mjs --slug <project-slug> --file <dataset.json>");
    process.exit(1);
  }
  return args;
}

function apiBase() {
  const url = process.env.TESTFORGE_API_URL;
  const key = process.env.TESTFORGE_API_KEY;
  if (!url || !key) {
    console.error("Missing TESTFORGE_API_URL / TESTFORGE_API_KEY in environment.");
    process.exit(1);
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function api(base, path, opts = {}) {
  const res = await fetch(`${base.url}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${base.key}`,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`${opts.method || "GET"} ${path} -> ${res.status}`);
    err.body = body;
    throw err;
  }
  return body;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function ensureSuites(base, slug, suiteDefs) {
  const existing = await api(base, `/projects/${slug}/suites`);
  const byPath = new Map(); // "Parent/Child" -> id
  const byId = new Map();
  for (const s of existing.data || []) byId.set(s.id, s);
  // Build existing path map (best-effort: only handles up to grandparent depth via parentId chain).
  function pathOf(suite) {
    const parts = [suite.name];
    let cur = suite;
    while (cur.parentId && byId.has(cur.parentId)) {
      cur = byId.get(cur.parentId);
      parts.unshift(cur.name);
    }
    return parts.join("/");
  }
  for (const s of existing.data || []) byPath.set(pathOf(s), s.id);

  for (const def of suiteDefs) {
    if (byPath.has(def.path)) continue;
    const segments = def.path.split("/");
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join("/");
    const parentId = parentPath ? byPath.get(parentPath) : null;
    if (parentPath && !parentId) {
      throw new Error(`Suite "${def.path}": parent "${parentPath}" not found — list parents before children in the dataset.`);
    }
    const created = await api(base, `/projects/${slug}/suites`, {
      method: "POST",
      body: JSON.stringify({ name, parentId: parentId || null }),
    });
    byPath.set(def.path, created.id ?? created.data?.id);
    console.log(`+ suite  ${def.path}`);
  }
  return byPath;
}

async function pushCases(base, slug, cases, suitePathToId) {
  const payload = cases.map((c) => {
    const suiteId = suitePathToId.get(c.suite);
    if (!suiteId) throw new Error(`Case "${c.title}": suite "${c.suite}" not found in suites[] — add it there first.`);
    const { suite, ...rest } = c;
    return {
      ...rest,
      suiteId,
      tags: Array.isArray(rest.tags) ? rest.tags.join(",") : rest.tags ?? "",
    };
  });

  let created = 0;
  for (const batch of chunk(payload, 500)) {
    try {
      const res = await api(base, `/projects/${slug}/cases/batch`, {
        method: "POST",
        body: JSON.stringify({ cases: batch }),
      });
      const ids = res.data ?? res;
      created += batch.length;
      console.log(`+ ${batch.length} cases created (batch of ${payload.length > 500 ? "500 max" : batch.length})`);
    } catch (err) {
      console.error(`Batch rejected (all-or-nothing, ${batch.length} cases NOT created):`);
      console.error(JSON.stringify(err.body?.error ?? err.message, null, 2));
      process.exitCode = 1;
      return created;
    }
  }
  return created;
}

async function main() {
  const { slug, file } = parseArgs(process.argv.slice(2));
  const base = apiBase();
  const dataset = JSON.parse(await readFile(file, "utf8"));

  console.log(`Pushing to project "${slug}" from ${file}`);
  const suitePathToId = await ensureSuites(base, slug, dataset.suites || []);
  const created = await pushCases(base, slug, dataset.cases || [], suitePathToId);
  console.log(`Done. ${created}/${dataset.cases.length} cases created.`);
}

main().catch((err) => {
  console.error(err.body ? JSON.stringify(err.body, null, 2) : err.message);
  process.exit(1);
});
