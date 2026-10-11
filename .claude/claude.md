# **TITAN RPG Foundry VTT System — Agent Instructions

## Architecture & Tech Stack**
* **Platform:** Foundry VTT v14 (ApplicationV2 API).
* **Core Stack:** JavaScript, Svelte 5 (Runes), SCSS.
* **Integration:** Direct mount of Svelte to ApplicationV2. No middleware.
* **File Structure:** All source code strictly resides in `~/src/`. Build output is generated in the `dist/` directory.

## Reference Docs
| Doc | Role |
|---|---|
| `docs/OPEN_BUGS.md` | Lists of currently open bugs and their history. |
| `docs/CLOSED_BUGS.md` | Lists of previously closed bugs and their history. |
| `docs/TODO.md` | Deferred-work backlog |
| `docs/POST_WORK_FINDINGS.md` | Living record of post-work review issues. Gotchas and issues that deserve attention. NOT a to-do list.  |

## Collaboration Rules (non-negotiable)

* **Preserve git history:** NEVER destroy, rewrite, or drop commits — no `push --force`, `reset --hard`, or history-dropping `rebase`. Prefer `revert` or new commits. Delete work branches after work, but confirm first.
* **Context management:** Pause and alert the user when the context window approaches or exceeds 80%; advise compaction or clear.
* **Objective and to the point:** Lead with load-bearing facts. Strip narrative scaffolding and redundant explanation. Not sycophantic. Evaluate thoroughly before recommending.
* **Give warning:** Surface concerns and confirm with the user when given bad or conflicting instructions.
* **Project Precedence.** The project `CLAUDE.md` SUPERCEDES any other.
* **Documentation:**  No unlogged todos — every bug is logged to `docs/OPEN_BUGs.md`. Every other deferred item is logged to `docs/TODO.md`. 

## Project Scope (non-negotiable)

* **No migrations yet.** Only the user's existing world exists, and no other world runs this system yet. Data changes
  are made by fixing that existing world directly, with a backup first and the user's knowledge. The migration system
  (`MigrateWorld`, version chains, the stored-actor walker, `migrateData` hooks) stays in the code for future public
  releases. While no migration is active there are no migration tests, generic or specific, and no code is added only to
  make migrations testable. A one-off test may confirm the system works, and is then reverted. Do not build or extend
  specific migrations, or run them live, unless the user asks for it.
* **Tests use genuine live documents.** Any test of a change to a document runs on documents made through real Foundry
  user flows. Tests may share documents; the suite keeps a running list and deletes every test document when it is done.
  Cleanup may use the API `delete`. Records from the user's world are never checked in as test data. Synthetic data is
  allowed only for UI elements, document-agnostic operations such as localization, intermediate computations on given
  inputs, and tests that invalid data is rejected or handled (real flows cannot produce invalid data). Values the system
  derives, such as a check's Dice Mod or Advantage from rules elements, are set up through the real flows that produce
  them. World settings may be set through the API. Mid-test document edits go through sheet and HUD controls, with a
  direct update only for a field that has no control.
* **Never make unverified claims.** Docs, comments and reports state only what was measured (with the command or log)
  or read (with the source location). Anything inferred is labelled as such.
* **No test poll lasts longer than 1 second.** Everything in the e2e suite runs on one machine, so a replicated
  update or a render lands at once. Every wait on something inside an already-loaded page (`expect.poll`,
  `waitForFunction`, `titanWait`, `toPass`, and explicit `timeout:` values on assertions and actions) has a ceiling of
  at most 1000 ms. A wait that needs longer is a defect to find and fix, not a ceiling to raise. World boot, login,
  page reload, the build, the `actionTimeout` safety net and per-test limits wait on a process starting and are
  outside this rule. So is the one real-hover test, which waits out the product's own hover-delay timer.

## Fable-class models

On Fable-class models (`claude-fable-5`, `claude-mythos-5`), follow the global `## Working style (Fable-class models)` section in `~/.claude/CLAUDE.md` in addition to these project rules. Where they conflict, that section governs on Fable-class models — specifically, **Context management** above is overridden by its §Context budget (do not pause for context). All other project rules remain in force, including **Consent required** (still pause before architecture, dependency, layout, naming, or public-API decisions) and **No unilateral spec/plan changes**. On all other models this section is inert.

**Memory boundary:** empirical and technical findings land in this project's documentation system (`docs/TODO.md`, `docs/OPEN_BUGS.md`, `docs/CLOSED_BUGS.md`, `docs/POST_WORK_FINDINGS.md`, and the `titan-codebase` skill), never only in auto-memory; auto-memory holds working-style lessons, user corrections, and session-resume state.

**Memory maintenance:** keep THIS project's auto-memory folder (`~/.claude/projects/C--FoundryVTT-V14-dev-foundryuserdata-Data-systems-titan/memory/`) to the standard as you work — one lesson per file with a one-line frontmatter `description`, indexed by a one-line entry in its `MEMORY.md`; update an existing file rather than creating a duplicate; correct or delete entries proven wrong or stale in the same session you notice. This project's lessons go here, not in another scope's memory folder.

## Workflow specific rules: 

### Planning:
* Ensure the `foundry-vtt` and `titan-codebase` skills are loaded. If the spec touches Svelte files, ensure both `svelte-5` and `foundry-svelte` are also loaded.

### Executing plans:
* **Do the work now:** Do not defer work by default. Fix issues immediately as they arise unless they involve cascading changes that require architectural decisions. When this happens, surface to the user.
* **Update Documentation:** Every plan and spec MUST include documentation updates as a required final step.
   * `docs/TODO.md` and `docs/OPEN_BUGS.md` and `docs/CLOSED_BUGS.md` must be immediately updated to reflect changes. 
   Delete completed items from `docs/TODO.md` and `docs/OPEN_BUGS.md`. Move completed bugs to `docs/CLOSED_BUGS.md` Log new adds. Add details for new discoveries.
   * Always update the `titan-codebase` skill (`.claude/skills/titan-codebase/`) following spec implementations. This must reflect the *current state* of the code, not a historical changelog.

## Strict Code Style Guidelines

### Formatting:
* 120-character wrap limit.
* Always use multi-line `{}` for conditional scopes.
* Require multi-line formatting for objects (>1 property) and arrays (>1 entry).
* Svelte components with >1 property must be multi-line, placing `>` or `/>` on a new line.

### Typing & Documentation:
* Variables: Must be typed and include a single-line descriptive comment.
* Functions: Require multi-line comments detailing purpose, typed parameters (`{Type} [optionalParam] - description`), and typed return values (including async operations).
* Classes/Objects: Strictly typed using `@extends`, `@typedef`, and `@typeof` where applicable.
* Grammar: All comments must have perfect spelling, grammar, and indentation.
* Writing Style: All comments must succinctly capture what the code does.
* Clean stale comments on contact. When work touches a file, fix or delete stale/incorrect comments in the touched scope. Never leave a comment the current code contradicts.

### CSS Restrictions: 
* `:global` style selectors are strictly forbidden.

## Code Hygeine
* No test or e2e code is compiled into shipping builds.
* Test and e2e code builds to `test/build/`; stale built files are deleted after every build.
* No dynamic imports in shipping builds, ever.
* No stub fixes — never paper over a problem with a stub/mock; fix the root cause.
* No unlogged todos — every deferred item is logged to `docs/TODO.md`. Bugs do NOT go here.
* No unlogged bugs — every bug is logged to `docs/TODO.md`.

## graphify

This project has a knowledge graph at graphify-out/ (TITAN source + Foundry v14 client/common) with god nodes, community structure, and cross-file relationships.

Use graphify only when it beats reading the files directly — questions that span multiple files:

- Cross-file or architecture questions (tracing a flow through a subsystem, "what depends on X", anything that would otherwise mean opening 3+ files): run `graphify query "<question>"` first.
- The relationship between two components: `graphify path "<A>" "<B>"`. A focused concept overview: `graphify explain "<concept>"`.
- Broad architecture review: read graphify-out/GRAPH_REPORT.md. If graphify-out/wiki/index.md exists, use it for broad navigation.

Skip graphify and go straight to Read/Grep when:

- You already know the file or symbol — single-file reads, single-symbol lookups, or edit/debug work on specific code.
- The question is answerable from one or two files you can name.

Maintenance: after modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).


## Collaboration & Execution Standards
**Core Directive:** Operations must be strictly verifiable, transparent, and aligned with established project architecture. Preserve all source history, surface constraints and complications proactively, and never unilaterally deviate from agreed specifications without explicit user consent.

### 1. Immutable History & Context Management
Never destroy, rewrite, or drop git commits. Avoid `push --force`, `reset --hard`, or history-dropping rebases; prefer `revert` or new commits. Continuously monitor the context window and proactively pause for compaction when approaching 80% capacity.

#### ❌ Bad (Destructive Actions / Silent Degradation)
```bash
# Destroying history to fix a mistake
git reset --hard HEAD~3
git push --force origin main

// Agent Output (Context limit ignored):
"Here is the 400th line of code..." (Agent silently drops instructions due to context overflow)
```

#### ✅ Good (Safe Reversion / Proactive Pausing)
```bash
# Preserving history while undoing a mistake
git revert a1b2c3d
git push origin main

// Agent Output:
"Context window is approaching 80%. Recommend clearing context or compacting memory before proceeding to the next architectural phase."
```

---

### 2. Architectural Consent & Verification
Before executing non-trivial work, summarize the intended change and verify it against `ENGINE_PRINCIPLES.md`, `PLAN.md`, and design docs. Pause and require explicit consent before establishing architecture, dependencies, file layouts, or public APIs.

#### ❌ Bad (Unilateral Decisions / Guessing)
```markdown
// Agent Output:
"I decided to add the `tokio` dependency and split the network logic into three new crates to make it async. Here is the code."
```

#### ✅ Good (Vetted Proposals)
```markdown
// Agent Output:
"Proposed update: Migrate input parsing to async. 
Verification: Aligns with `ENGINE_PRINCIPLES.md` rule on non-blocking I/O.
Consent required: Should I add `tokio` as a dependency and place the new module in `src/net/`?"

```

---

### 3. Strict Spec Adherence & Failure Verification
Never deviate from an agreed spec (skipping, downgrading, or re-scoping tasks) based on assumed facts or sub-agent claims. Always verify claims against the code. If a plan fails to produce expected results, assume improper implementation first, rather than a flawed spec.

#### ❌ Bad (Unilateral Re-scoping / Trusting Assumptions)
```markdown
// Agent Output:
"The sub-agent failed to parse the UI tree, so I skipped the accessibility pass since it seems too complex right now. Moving to the next task."

```

#### ✅ Good (Verified Claims / Rigorous Debugging)
```markdown
// Agent Output:
"The render pass yielded a blank screen. Treating this as an implementation failure rather than a spec issue. Verifying matrix transformations against the architecture doc before requesting a spec change."

```

---

### 4. Inline Execution & Complication Reporting
Do the work now. Fix small, clear follow-ups inline alongside unit tests. Defer work *only* if it actively conflicts with the current goal or context limits, and never defer without logging it to `TODO.md`. Surface complications immediately upon discovery, not at the end of a run.

#### ❌ Bad (Silent Deferrals / Late Reporting)
```rust
// In code:
// TODO fix this memory leak later
let buffer = allocate_buffer(); 

// Agent Output at end of run:
"Finished the feature. By the way, the dependency resolution failed earlier so half the tests are broken."
```

#### ✅ Good (Immediate Action / Proactive Flagging)
```rust
// In code:
let buffer = allocate_buffer();
// ... immediately writing the cleanup logic and unit test ...
free_buffer(buffer);

// Agent Output mid-run:
"Halting execution. Encountered a version conflict with `serde` during setup. We must resolve this dependency complication before proceeding with the implementation."
```

---

### 5. Objective Communication & Rule Precedence
Communicate with load-bearing facts. Strip sycophantic language and redundant explanations. Give explicit warnings when given conflicting or bad instructions. The project `CLAUDE.md` supersedes any other instruction.

#### ❌ Bad (Sycophantic / Verbose / Compliant to a Fault)
```markdown
// Agent Output:
"That is a brilliant idea! I would be absolutely delighted to implement that global singleton for you right away, even though it breaks our threading model, because you know best!"
```

#### ✅ Good (Objective / Warning-Oriented)
```markdown
// Agent Output:
"Warning: The requested global singleton conflicts with the lock-free threading model defined in `CLAUDE.md`. Implementing this will introduce race conditions. Please confirm if you want to proceed with this deviation."
```

Here is the optimized guidelines set for data privacy, security, and intellectual property, formatted to match the agent-optimized structure.

---

## Security & IP Standards
**Core Directive:** Zero-tolerance for intellectual property infringement and data leaks. System state, test fixtures, and debug dumps must remain strictly sanitized of all proprietary code, credentials, and Personally Identifiable Information (PII).

### 1. Zero IP Infringement & Clean-Room Implementations
Never ingest, reproduce, or reference proprietary, copyrighted, or leaked code. If an algorithm is required, implement it as a clean-room design based strictly on academic papers, standard mathematical formulas, or public API documentation. Never mention proprietary software in source files.

#### ❌ Bad (Copyrighted/Proprietary References)
```javascript
// Copied this snippet from the leaked Windows XP source code.
// Implementing the physics identical to Havok engine.
```

#### ✅ Good (Clean-Room / Academic Citations)
```javascript
// Algorithm: Ray-AABB intersection. Source: [Majercik et al. 2018].
// Implements broad-phase collision detection using a standard spatial hash grid.
```

---

### 2. No PII or Real Credentials
Code, configuration files, test suites, and debug dumps must be completely void of Personally Identifiable Information (PII), real user data, internal corporate emails, and hardcoded secrets (API keys, tokens, passwords). Always inject secrets via environment variables or secure credential managers.

#### ❌ Bad (Hardcoded Secrets & Real Data)
```javascript
const testApiKey = "sk-proj-9876543210abcdef";
const targetTestUser = "sarah.jenkins@acmecorp.com";
```

#### ✅ Good (Environment Variables & Safe Domains)
```javascript
const testApiKey = process.env.TEST_API_KEY;
const targetTestUser = "testuser-01@example.com"; // using RFC 2606 reserved domains
```

---

### 3. Safe Mock Data Generation
When generating test fixtures or seed data, use deterministic, structurally correct, but obviously synthetic data. Never use subsets of real production databases. Ensure fake data passes validation without triggering actual downstream systems (e.g., using `555` area codes, `.example` TLDs).

#### ❌ Bad (Production Data Subsets / Plausible Fake Data)
```json
// target/test-fixtures/users.json
{
  "id": "u_8472",
  "name": "David Smith",
  "ssn": "123-45-6780",
  "phone": "310-555-0199" // Plausible/real formats risk accidental routing
}
```

#### ✅ Good (Obviously Synthetic Data)
```json
// target/test-fixtures/users.json
{
  "id": "usr_test_001",
  "name": "MOCK_USER_A",
  "ssn": "000-00-0000",
  "phone": "+1-800-555-0199" // Strictly reserved testing ranges
}
```

---

### 4. Active Sanitization on Contact
If the provided workspace context, logs, or user instructions inadvertently contain PII or secrets, scrub them in memory immediately. Never echo compromised data into `POST_WORK_FINDINGS.md`, `debug/dumps/`, or commit messages.

#### ❌ Bad (Echoing Leaked Data)
```markdown
// docs/OPEN_BUGS.md
- [Crash] API failed when querying customer Jane Doe (DOB: 05/12/1984) with credit card ending in 4111.
```

#### ✅ Good (Scrubbing / Redacting)
```markdown
// docs/OPEN_BUGS.md
- [Crash] API failed when querying mock customer record due to malformed date parser. [PII Redacted from original log].
```

## Code Commenting Rules
**Core Directive:** Optimize for machine context and exact state. Strip all narrative scaffolding, chatter, and historical/process metadata. Lead with load-bearing facts: invariants, constraints, and hidden coupling.

### 1. Zero-History Current State
Comments must state what the code does or why it exists in the *present tense*, strictly regarding the current implementation. Do not narrate project history, bug fixes, or previous iterations. Express historical reasons as present architectural constraints.

#### ❌ Bad (Narrative / History)
```javascript
// Previously we used an Array here, but it caused O(n) lookups which bugged out in v2.1.
// Fixed a bug where the shadows flickered when the camera moved.
```

#### ✅ Good (Present Constraint)
```javascript
// Uses a Set to enforce O(1) lookups; duplicate entries degrade rendering performance.
// Constraint: Shadow map updates must sync with camera translation to prevent sub-pixel artifacting.
```

---

### 2. No Process Meta
Never include task IDs, sprint references, spec documents, or narration addressed to reviewers. Agents cannot resolve external tracking systems; these waste context window space.

#### ❌ Bad (Process Meta)
```javascript
// Per TICKET-842: Add padding to the struct for alignment.
// As discussed in the PR, I bypassed the cache here.
```

#### ✅ Good (Technical Intent)
```javascript
// Padding aligns struct to 16-byte boundary for SIMD load compatibility.
// Cache bypassed: Real-time telemetry data must stream directly to the allocator.
```

---

### 3. Actionable, Standardized TODOs
Forward-looking markers must use a strict `TODO:` prefix describing the technical work required. No assignee names, dates, or ticket IDs. If a TODO represents a deferred item, it must be externally logged.

#### ❌ Bad (Vague / Meta-tied)
```javascript
// TODO(@dave): Refactor this phase later (Epic 5).
// deferred to later: handle network timeouts
```

#### ✅ Good (Plain Task)
```javascript
// TODO: Extract token parsing into a distinct, stateless utility class.
// TODO: Implement exponential backoff for network timeout retries.
```

---

### 4. Cite and Explain Decisions
Every algorithmic, rendering, or data-flow decision must cite its source and justify its selection over alternatives. An uncited pipeline decision is incomplete context.

#### ❌ Bad (Unjustified)
```javascript
// Using GGX for the shading model.
// Sort the passes before execution.
```

#### ✅ Good (Cited & Justified)
```javascript
// Algorithm: GGX microfacet BRDF. Source: [Walter et al. 2007]. Chosen over Beckmann for longer specular tails, satisfying the PBR constraint.
// Sorts render passes by material ID. Source: Architecture Spec v1. Minimizes pipeline state changes on the GPU.
```

---

### 5. Lead with Invariants & Hidden Coupling
Define technical terms inline. Prioritize documenting hidden coupling (what else breaks if this changes) and mathematical invariants.

#### ❌ Bad (Over-explained Chatter)
```javascript
// Here we start the process of breaking down the fat cells, which is called lipolysis.
// Make sure the buffer is cleared before calling this, or it will crash.
```

#### ✅ Good (Invariants & Coupling)
```javascript
// Executes lipolysis (breaking down fat). INVARIANT: Input matrix must be normalized.
// Implicit Coupling: Depends on 'RenderPass::Begin' clearing the output buffer to 0x00.
```

---

### 6. Clean Stale Comments on Contact
Treat all existing comments as STALE until verified against executing code. When modifying a code block, you must actively delete or update comments that contradict the new logic.

#### ❌ Bad (Orphaned Comment)
```javascript
// Returns true if the user is an admin.
return role == Role.MODERATOR;
```

#### ✅ Good (Synchronized)
```javascript
// Returns true if the user has moderator privileges.
return role == Role.MODERATOR;
```

Here is the optimized guidelines set for workflow, documentation, and source control, formatted with the same agent-optimized structure and specific examples.

---

## Documentation Standards
**Core Directive:** System state must remain synchronized with reality. Documentation updates are mandatory prerequisites for context clearing. Artifacts must remain hygienic, and source control operations must proceed autonomously based on CI triggers.

### 1. Strict Final-Step Documentation
Documentation updates are the mandatory final step before clearing or compacting context. The plan is incomplete until all tracking files (`PLAN.md`, `TODO.md`, `OPEN_BUGS.md`, `CLOSED_BUGS.md`, `POST_WORK_FINDINGS.md`) reflect empirically verified reality. Do not record conjecture.

#### ❌ Bad (Incomplete / Lazy Handoff)
```markdown
// Agent Output:
"Finished implementing the renderer. I'm ready to clear context and start the next phase." 
(No file updates made; completed tasks left in PLAN.md).
```

#### ✅ Good (Rigorous State Sync)
```markdown
// Agent Output:
"Phase complete. Executing documentation sync:"
- `docs/PLAN.md`: Moved 'Implement Renderer' to Completed (points to mem_04.md).
- `docs/OPEN_BUGS.md`: Removed #12 (verified fixed).
- `docs/CLOSED_BUGS.md`: Logged #12 resolution.
- `target/`: Cleared stale build artifacts.
```

---

### 2. Segregate Bugs from TODOs
Maintain strict boundaries for tracking files. Bugs never go in `TODO.md`. Deferrals go in `TODO.md` (optimized and trimmed). Mid-run anomalies go to `POST_WORK_FINDINGS.md`.

#### ❌ Bad (Mixed Concerns)
```markdown
// docs/TODO.md
- Refactor the input handler.
- BUG: Game crashes when pressing Esc.
- Found out the physics tick is decoupled from frame rate, maybe fix later?
```

#### ✅ Good (Strict Segregation)
```markdown
// docs/TODO.md
- Extract stateless input parsing to utility class.

// docs/OPEN_BUGS.md
- [Crash] Unhandled panic on Esc keydown during main menu transition.

// docs/POST_WORK_FINDINGS.md
- Title: Physics Tick Decoupling. Summary: Physics updates run async to frame rate; potential race condition identified. Status: Needs Review.
```

---

### 3. Centralized, Ephemeral Debug Dumps
All debug artifacts must use a single sink: `debug/dumps/` at the workspace root. Never write stray artifacts to the repo root or `target/`. Dumps are ephemeral; delete them once the associated bug family is resolved. Never commit dump files.

#### ❌ Bad (Scattered / Persistent Dumps)
```bash
# Writing a debug trace to the root directory
fs.writeFileSync("./trace_output_final.json", dump);

# Leaving dumps around after a fix
git add debug/dumps/memory_leak_trace.ppm
git commit -m "Fixed memory leak"
```

#### ✅ Good (Centralized / Cleaned Dumps)
```bash
# Writing strictly to the designated sink
fs.writeFileSync("./debug/dumps/trace_output.json", dump);

# Post-fix cleanup (trash, not rm — recoverable via Recycle Bin)
trash ./debug/dumps/*
git commit -m "Fix memory leak in texture allocator"
```

---

### 4. No Debug Code in Release Builds
Debug code never reaches the release build. Strip temporary instrumentation — `dbg!`, debug `println!` / `eprintln!`, `console.log`, `debugger;`, and commented-out scaffolding — before committing. Diagnostics that must persist run through a leveled facility that is silenced or compiled out in release: client logging through the project logger, never a raw `console.log`.

#### ❌ Bad (Instrumentation Shipped to Release)
```javascript
function applyOptimistic(op) {
    console.log("op", op); // retained in the production client bundle
    debugger;              // halts the shipped client in a user's browser
    store.apply(op);
}
```

#### ✅ Good (Stripped or Gated)
```javascript
function applyOptimistic(op) {
    // Routed through the project logger; pruned from the production build.
    logger.debug("applying optimistic op", op);
    store.apply(op);
}
```

---

### 5. Autonomous Commits & Milestone Pushes
Do not pause to ask for permission. Commit logical work-units immediately once local CI passes. Push to remote *only* when a FULL milestone is completed. Do not batch unrelated concerns into a single commit.

#### ❌ Bad (Pausing / Batching / Premature Push)
```text
// Agent Output:
"Local tests passed. Should I commit these changes?"
// Or:
git commit -m "Fixed physics bug and also updated the UI padding"
git push origin main # (Pushed on a sub-task, not a full milestone)
```

#### ✅ Good (Autonomous Action)
```bash
# Local CI passes. Committing logical unit immediately.
git commit -m "Fix physics body penetration depth calculation"

# Milestone complete. Pushing autonomously.
git push origin main
gh run watch # Monitoring pipeline post-push
```

---