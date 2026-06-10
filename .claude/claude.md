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

## Fable-class models

On Fable-class models (`claude-fable-5`, `claude-mythos-5`), follow the global `## Working style (Fable-class models)` section in `~/.claude/CLAUDE.md` in addition to these project rules. Where they conflict, that section governs on Fable-class models — specifically, **Context management** above is overridden by its §Context budget (do not pause for context). All other project rules remain in force, including **Consent required** (still pause before architecture, dependency, layout, naming, or public-API decisions) and **No unilateral spec/plan changes**. On all other models this section is inert.

**Memory boundary:** empirical and technical findings land in this project's documentation system (`docs/TODO.md`, `docs/OPEN_BUGS.md`, `docs/CLOSED_BUGS.md`, `docs/POST_WORK_FINDINGS.md`, and the `titan-codebase` skill), never only in auto-memory; auto-memory holds working-style lessons, user corrections, and session-resume state.

**Memory maintenance:** keep THIS project's auto-memory folder (`~/.claude/projects/C--FoundryVTT-V14-dev-foundryuserdata-Data-systems-titan/memory/`) to the standard as you work — one lesson per file with a one-line frontmatter `description`, indexed by a one-line entry in its `MEMORY.md`; update an existing file rather than creating a duplicate; correct or delete entries proven wrong or stale in the same session you notice. This project's lessons go here, not in another scope's memory folder.

## Workflow specific rules: 

### Planning:
* Ensure the `foundry-vtt` and `titan-codebase` skills are loaded. If the spec touches Svelte files, ensure both `svelte-5` and `foundry-svelte` are also loaded.

### Executing plans:
* **Align and vet before starting.** Before non-trivial work: restate the change in 1–2 sentences, then check it (and any options being weighed) against `ENGINE_PRINCIPLES.md` + `PLAN.md` + relevant `docs/design/` documents. Surface conflicts for review before starting; surface tradeoffs explicitly when presenting choices. Plan-mode plans must include a summary.
* **Consent required.** Pause and ask before deciding on architecture, dependencies, file/crate layout, naming, or public APIs. Prefer asking over guessing.
* **Be ready to pivot.** A locked decision means we check before changing it — and we challenge locks when we find something better.
* **Sub-agent routing:** Because sub-agents do not use skills unless explicitly prompted, include the relevant skill invocations in their prompts. Domain agents auto-invoke their own skill chains (do not repeat the skill list in their prompts):
  * `titan-svelte-dev` — anything that touches .svelte files.
* **No unilateral spec/plan changes.** NEVER deviate from an agreed spec or plan (skipping, downgrading, re-scoping, or changing a task/default) without BOTH:
  1. Directly verifying any claim the deviation rests on against the code AND the spec — never trust a sub-agent's or your own assumed fact. A sub-agent claim that contradicts the spec is a red flag to verify, not adopt.
  2. Consulting the user first.
* **Verify Failure:** A null result can mean improper implementation. When a plan fails to produce the expected result, treat it is implemented improperly until PROVEN otherwise.
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
# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.
