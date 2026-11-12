# TITAN RPG Foundry VTT System — Agent Instructions

## Project
- Platform: Foundry VTT v14 (ApplicationV2 API).
- Stack: JavaScript, Svelte 5 (Runes), SCSS.
- Integration: Svelte mounts directly to ApplicationV2. No middleware.
- All source resides in `src/`. Build output goes to `dist/`.

## Reference Docs
| Doc | Role |
|---|---|
| `docs/OPEN_BUGS.md` | Currently open bugs and their history |
| `docs/CLOSED_BUGS.md` | Previously closed bugs and their history |
| `docs/TODO.md` | Deferred-work backlog |
| `docs/POST_WORK_FINDINGS.md` | Living record of post-work review issues. Gotchas and issues that deserve attention. NOT a to-do list |

## Collaboration

### Immutable History & Context
- Never destroy, rewrite, or drop commits: no `push --force`, `reset --hard`, or history-dropping `rebase`. Prefer `revert` or new commits.
- Delete work branches after the work is done, but confirm first.
- Pause and alert the user when the context window approaches or exceeds 80%, and advise compaction or a clear.
- **Good:** `git revert a1b2c3d`; "Context is near 80%. Recommend compacting before the next phase."
- **Bad:** `git reset --hard HEAD~3` then `git push --force origin main`; continuing past 80% context.

### Architectural Consent
- Before non-trivial work, summarize the intended change and verify it against the `titan-codebase` skill and the relevant docs.
- Dependencies, file layouts, and public APIs are architectural choices requiring consent.
- If a plan fails to produce expected results, assume improper implementation before a flawed spec.
- **Good:** "Proposed: format roll results with a third-party library. Consent required: add it as a dependency?"
- **Good:** "The sheet rendered stale values. Treating this as an implementation failure and verifying the derived-value order before requesting a spec change."
- **Bad:** "I added a formatting library and split the sheet into three new modules."

### Complications
- Fix issues immediately as they arise, with unit tests for small, clear follow-ups. Don't defer by default.
- Defer only work that actively conflicts with the current goal or context limits, or that needs cascading changes requiring architectural decisions (surface those to the user).
- Log every bug to `docs/OPEN_BUGS.md` and every other deferred item to `docs/TODO.md`. Nothing goes unlogged.
- Surface complications the moment you find them, not at the end of a run.
- **Good:** Mid-run: "Halting. Version conflict with `svelte` during setup; resolving before implementation."
- **Bad:** End of run: "By the way, dependency resolution failed earlier, so half the tests are broken."

### Warnings & Precedence
- Warn and confirm with the user when instructions conflict or are flawed. Evaluate thoroughly before recommending.
- The project `CLAUDE.md` supersedes any other instruction.
- **Good:** "Warning: the requested middleware layer conflicts with the direct Svelte-to-ApplicationV2 mount in `CLAUDE.md`. Confirm to proceed."
- **Bad:** Adding the middleware immediately despite the conflict.

## Project Scope

### No Migrations Yet
- Only the user's existing world exists; no other world runs this system. Data changes are made by fixing that world directly, with a backup first and the user's knowledge.
- The migration system (`MigrateWorld`, version chains, the stored-actor walker, `migrateData` hooks) stays in the code for future public releases.
- While no migration is active, there are no migration tests (generic or specific) and no code added only to make migrations testable. A one-off test may confirm the system works, then is reverted.
- Do not build or extend specific migrations, or run them live, unless the user asks.

### Live-Document Tests
- Any test of a document change runs on documents made through real Foundry user flows. Tests may share documents. The suite keeps a running list and deletes every test document when done; cleanup may use the API `delete`.
- Never check in records from the user's world as test data.
- Synthetic data is allowed only for UI elements, document-agnostic operations (e.g. localization), intermediate computations on given inputs, and tests that invalid data is rejected or handled (real flows cannot produce invalid data).
- Values the system derives (e.g. a check's Dice Mod or Advantage from rules elements) are set up through the real flows that produce them.
- World settings may be set through the API. Mid-test document edits go through sheet and HUD controls, with a direct update only for a field that has no control.

### Test Waits
- Every wait on something inside an already-loaded page is at most 1000 ms: `expect.poll`, `waitForFunction`, `titanWait`, `toPass`, and explicit `timeout:` values on assertions and actions. The e2e suite runs on one machine, so replicated updates and renders land at once.
- A wait that needs longer is a defect to find and fix, not a ceiling to raise.
- Exempt (they wait on a process starting): world boot, login, page reload, the build, the `actionTimeout` safety net, and per-test limits. Also exempt: the one real-hover test, which waits out the product's own hover-delay timer.

## Memory
- This project's auto-memory folder is `~/.claude/projects/C--FoundryVTT-V14-dev-foundryuserdata-Data-systems-titan/memory/`. This project's lessons go here, not in another scope's folder.
- Correct or delete entries proven wrong or stale in the same session you notice.

## Planning
- Ensure the `foundry-vtt` and `titan-codebase` skills are loaded. If the spec touches Svelte files, also load `svelte-5` and `foundry-svelte`.

## Code Style

### Formatting
- 120-character wrap limit.
- Always use multi-line `{}` for conditional scopes.
- Objects with more than 1 property and arrays with more than 1 entry are multi-line.
- Svelte components with more than 1 property are multi-line, with `>` or `/>` on a new line.

### Typing & Documentation
- Variables: typed, with a single-line descriptive comment.
- Functions: multi-line comment detailing purpose, typed parameters (`{Type} [optionalParam] - description`), and typed return values (including async operations).
- Classes and objects: strictly typed using `@extends`, `@typedef`, and `@typeof` where applicable.
- Comments have perfect spelling, grammar, and indentation, and succinctly capture what the code does.

### CSS
- `:global` style selectors are forbidden.

## Code Hygiene
- No test or e2e code is compiled into shipping builds. Test and e2e code builds to `test/build/`, and stale built files are deleted after every build.
- No dynamic imports in shipping builds, ever.

## Graphify
- The knowledge graph at `graphify-out/` covers TITAN source plus Foundry v14 client/common, with god nodes, community structure, and cross-file relationships.
- Use it only when it beats reading the files directly: cross-file or architecture questions, tracing a flow through a subsystem, "what depends on X", anything that would mean opening 3+ files. Run `graphify query "<question>"` first.
- Use `graphify path "<A>" "<B>"` for the relationship between two components and `graphify explain "<concept>"` for a focused concept overview.
- For broad architecture review, read `graphify-out/GRAPH_REPORT.md`. If `graphify-out/wiki/index.md` exists, use it for broad navigation.
- Skip it for single-file reads, single-symbol lookups, edit/debug work on specific code, and anything answerable from one or two files you can name.
- After modifying code, run `graphify update .` (AST-only, no API cost).

## Security & IP
- Zero tolerance for intellectual property infringement and data leaks. System state, test fixtures, and debug dumps stay free of proprietary code, credentials, and PII.

### Clean-Room Implementations
- Never ingest, reproduce, or reference proprietary, copyrighted, or leaked code. Never mention proprietary software in source files.
- When an algorithm is required, implement it clean-room from academic papers, standard formulas, or public API documentation, and cite the source.
- **Good:** `// Algorithm: Ray-AABB intersection. Source: [Majercik et al. 2018].`
- **Bad:** `// Implementing the physics identical to Havok engine.`

### Secrets & PII
- Code, config, tests, and debug dumps contain no PII, real user data, internal corporate emails, or hardcoded secrets. Inject secrets via environment variables or a credential manager.
- Test fixtures and seed data are deterministic, structurally valid, and obviously synthetic. Never use subsets of production data. Use reserved test values that cannot reach real systems (`example.com` and `.example` domains per RFC 2606, `555` numbers).
- **Good:** `process.env.TEST_API_KEY`, `"testuser-01@example.com"`, `"name": "MOCK_USER_A", "ssn": "000-00-0000"`
- **Bad:** `"sk-proj-9876543210abcdef"`, `"sarah.jenkins@acmecorp.com"`, `"name": "David Smith"`

### Sanitization on Contact
- If workspace context, logs, or instructions contain PII or secrets, scrub them immediately. Never echo them into tracking files (`POST_WORK_FINDINGS.md`, `OPEN_BUGS.md`), `debug/dumps/`, or commit messages.
- **Good:** "API failed on mock customer record due to malformed date parser. [PII redacted from original log]."
- **Bad:** "API failed when querying customer Jane Doe (DOB: 05/12/1984) with credit card ending in 4111."

## Comments

### Standards
- Optimize for machine context and exact state. Lead with load-bearing facts: invariants, constraints, hidden coupling. No narrative scaffolding or chatter.
- State what the code does or why it exists, in the present tense. Express historical reasons as present constraints.
- Banned: project history, bug-fix narration, task IDs, sprint references, spec documents, and narration addressed to reviewers. Agents cannot resolve external tracking systems.
- Cite the source and justify the choice for every algorithmic, rendering, or data-flow decision.
- Define technical terms inline. Document hidden coupling (what else breaks if this changes) and mathematical invariants.
- Use a `TODO:` prefix describing the technical work. No assignee, date, or ticket ID. Log every `TODO:` in `docs/TODO.md`.
- Treat existing comments as stale until verified against the executing code. When work touches a file, fix or delete stale or incorrect comments in the touched scope. Never leave a comment the current code contradicts.
- **Good:** `// Uses a Set to enforce O(1) lookups; duplicate entries degrade rendering performance.`
- **Good:** `// Algorithm: GGX microfacet BRDF. Source: [Walter et al. 2007]. Chosen over Beckmann for longer specular tails.`
- **Good:** `// Implicit coupling: depends on RenderPass::Begin clearing the output buffer to 0x00.`
- **Bad:** `// Previously we used an Array here, but it caused O(n) lookups in v2.1.`
- **Bad:** `// Per TICKET-842: add padding to the struct.`
- **Bad:** `// TODO(@dave): Refactor this phase later (Epic 5).`

## Documentation

### Tracking Files
- Every plan and spec includes documentation updates as a required final step. The last step before clearing or compacting context is updating every tracking file; the plan is incomplete until they are current.
- `docs/TODO.md`: deferrals only, trimmed and optimized. Delete completed items. Bugs never go here.
- `docs/OPEN_BUGS.md`: log new bugs, add details on new discoveries, delete completed bugs.
- `docs/CLOSED_BUGS.md`: move completed bugs here.
- `docs/POST_WORK_FINDINGS.md`: log mid-run anomalies.
- `titan-codebase` skill (`.claude/skills/titan-codebase/`): update after every spec implementation. It reflects the current state of the code, not a historical changelog.
- **Good:** `OPEN_BUGS.md`: "- [Crash] Unhandled exception rendering the sheet after deleting the last item."
- **Bad:** `TODO.md` containing "BUG: Sheet crashes when deleting the last item."

### Debug Dumps
- Write all debug artifacts to `debug/dumps/` at the workspace root, never to the repo root or `dist/`.
- Delete dumps once the bug family is resolved. Never commit them.
- **Good:** `fs.writeFileSync("./debug/dumps/trace_output.json", dump)`
- **Bad:** `fs.writeFileSync("./trace_output_final.json", dump)`; `git add debug/dumps/memory_leak_trace.json`

### Release Builds
- Debug code never reaches release builds. Before committing, strip temporary instrumentation: `console.log`, `debugger;`, commented-out scaffolding.
- Persistent diagnostics go through the project logger, never raw `console.log`.
- **Good:** `logger.debug("applying optimistic op", op)`
- **Bad:** `console.log("op", op); debugger;`

### Commits & Pushes
- Commit each logical work-unit as soon as local CI passes, without asking. Don't batch unrelated concerns into one commit.
- Push only when a full milestone completes.
- **Bad:** `git push origin main` after a sub-task rather than a full milestone.