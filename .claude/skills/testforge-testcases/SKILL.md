---
name: testforge-testcases
description: Design a test-case suite tree for a feature/app and push it to TestForge (testforge.emha.space) via its REST API v1 — suites, then batch-created cases. Use when asked to write test cases for a project and get them into TestForge, to expand an existing suite (e.g. tkpdd), or to debug a TestForge API push (422/500, tags format, batch limits).
---

# TestForge test-case authoring & push

Reproduces the process used to build Tokopudidi's 116-case suite in TestForge
project `tkpdd` (10 top-level areas, 42 leaf sub-suites). Two phases: **author**
a JSON dataset, then **push** it with `scripts/push-cases.mjs`.

## 0. Prerequisites

- `TESTFORGE_API_URL` and `TESTFORGE_API_KEY` in the target repo's `.env`
  (Tokopudidi already has both under the `# TestForge` section). The key must be
  a **write**-scoped key or every POST 403s.
  - `TESTFORGE_API_URL` **must include the `/api/v1` prefix** — e.g.
    `https://testforge.emha.space/api/v1`. The push script appends resource
    paths straight onto it, so a bare host makes every call 404. Not to be
    confused with `TF_API_URL` used by the `testforge-e2e-ci` skill, which
    takes the bare host and appends `/api/v1` itself.
- **Node 20+** — the script uses global `fetch` (18+) and is invoked with
  `--env-file` (20.6+). On Node 16 it dies with `ReferenceError: fetch is not
  defined`. Check `node -v` before blaming the API.
- The project slug (e.g. `tkpdd`) — ask the user if unknown, don't guess.
- Live schema is authoritative over this doc if they ever diverge: fetch
  `${TESTFORGE_API_URL}/openapi` (ReDoc at `/docs/api`).

## 1. Author the dataset (don't skip this — it's most of the value)

Write one JSON file (see `references/dataset.example.json`) with two arrays:

```jsonc
{
  "suites": [
    { "path": "Autentikasi & Akun" },
    { "path": "Autentikasi & Akun/Login" }        // "/" = nested sub-suite, auto-created in order
  ],
  "cases": [
    {
      "suite": "Autentikasi & Akun/Login",         // must match a suites[].path above
      "title": "Login sukses dengan nomor HP terdaftar + password benar",
      "priority": "HIGH",                            // CRITICAL | HIGH | MEDIUM | LOW
      "type": "FUNCTIONAL",                           // FUNCTIONAL | REGRESSION | SMOKE | PERFORMANCE | SECURITY | E2E
      "tags": ["auth", "login", "happy-path"],       // array in the dataset; script joins to CSV before sending
      "preconditions": "User terdaftar dengan phone +6281234567890",
      "steps": [
        { "action": "POST /auth/login dengan {phone, password} valid", "expected": "200 + JWT token" }
      ],
      "expectedResult": "Login berhasil, token tersimpan, redirect ke home"
    }
  ]
}
```

Coverage checklist per feature area (this is what made the 116-case set useful,
not just numerous):
- **Happy path** — the documented success flow.
- **Negative / validation** — missing/malformed fields, wrong types, boundary
  values (empty string, over max length, negative numbers).
- **RBAC** — same action attempted as each role that exists (guest, buyer,
  seller, admin) — assert both the allowed and the 403/401 cases.
- **Security** — auth bypass attempts, IDOR (accessing another user's
  resource by ID), rate-limit/brute-force where relevant.

Match the real schema before writing cases, not the other way round — read
the actual Zod schema / route handler for the feature first (e.g.
`loginSchema = {phone, password}`, not email) so cases don't describe a UI
that doesn't exist. This was the exact mistake in the first Tokopudidi login
suite (8 cases assumed email login; app is phone-based).

Suite tree convention used for Tokopudidi (reuse or adapt): one top-level
suite per functional area, 2–4 leaf sub-suites each, cases attach only to
leaves. Keep leaf names short — they show up in `TC-<SLUG>-<NUM>` context but
not in the ID itself.

## 2. Push it

```bash
cd <repo-with-.env>   # e.g. tokopudidi — script reads TESTFORGE_API_URL/KEY from its .env
node .claude/skills/testforge-testcases/scripts/push-cases.mjs \
  --slug tkpdd \
  --file path/to/dataset.json
```

The script:
1. `GET /projects/:slug/suites`, builds a path→id map of what already exists.
2. Creates any missing suite in `suites[]` in file order (parent before
   child — that's why the dataset lists parents first), via
   `POST /suites {name, parentId}`.
3. Resolves each `cases[].suite` path to a `suiteId`, **joins `tags` array to
   a comma-string** (see gotcha below), chunks into batches of ≤500, and
   POSTs each chunk to `POST /projects/:slug/cases/batch`.
4. Prints created `displayId`s and stops on the first rejected batch — batch
   create is **all-or-nothing**, so on a 422 it prints the per-item
   `details[]` from the error envelope and none of that chunk was created.

Re-running is safe for suites (path map dedupes by name+parent) but **not**
idempotent for cases — it always creates new ones. For updates to existing
cases, use `PATCH /cases/:id` one at a time, not this script.

## Gotchas (verified live against testforge.emha.space, 2026-07)

- **`tags` on `POST /cases` and `/cases/batch` is a comma-separated string,
  not an array** — `CaseInput.tags: {type: "string"}` in the OpenAPI schema.
  Sending an array returns **HTTP 500** (server-side crash, not a clean 422).
  The push script handles this by joining arrays for you; if you're calling
  the API directly, join yourself: `tags.join(",")`.
- Batch cap is 500 cases per call; the script chunks automatically.
- `POST /suites` needs `parentId` (not a path string) — always create parents
  before children, which is why order in `suites[]` matters.
- Error envelope is uniform: `{error: {code, message, details[]}}` — read
  `details` for which item/field failed.
- There's a separate, newer **GitOps path** (`testforge-cli cases pull|status|push`
  syncing a `tests/` YAML folder, see `docs/CASES-AS-CODE.md` in the testforge
  repo) where `tags` in `fields` *is* an array — don't mix the two mental
  models, they're different endpoints (`/cases/sync` vs `/cases/batch`) with
  different conventions.

## Verify

```bash
curl -s "$TESTFORGE_API_URL/projects/tkpdd/cases?updatedSince=2026-07-21T00:00:00Z" \
  -H "Authorization: Bearer $TESTFORGE_API_KEY" | jq '.data | length'
```

Or just open `https://testforge.emha.space/projects/tkpdd` in the browser and
check the suite tree / case count.
