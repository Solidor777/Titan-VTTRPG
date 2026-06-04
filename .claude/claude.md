### **TITAN RPG Foundry VTT System: AI Context (Updated)**

**1. Architecture & Tech Stack**

* **Platform:** Foundry VTT v14 (ApplicationV2 API).
* **Core Stack:** JavaScript, Svelte 5 (Runes), SCSS.
* **Integration:** Direct mount of Svelte to ApplicationV2. No middleware.
* **File Structure:** All source code strictly resides in `~/src/`. Build output is generated in the `dist/` directory.
* **Build Rules (strict):**
1. No test or e2e code is compiled into shipping builds.
2. Test and e2e code builds to `test/build/`; stale built files are deleted after every build.
3. No dynamic imports in shipping builds, ever.

**2. Strict Code Style Guidelines**

* **Formatting:**
* 120-character wrap limit.
* Always use multi-line `{}` for conditional scopes.
* Require multi-line formatting for objects (>1 property) and arrays (>1 entry).
* Svelte components with >1 property must be multi-line, placing `>` or `/>` on a new line.


* **Typing & Documentation:**
* Variables: Must be typed and include a single-line descriptive comment.
* Functions: Require multi-line comments detailing purpose, typed parameters (`{Type} [optionalParam] - description`), and typed return values (including async operations).
* Classes/Objects: Strictly typed using `@extends`, `@typedef`, and `@typeof` where applicable.
* Grammar: All comments must have perfect spelling, grammar, and indentation.
* Writing Style: All comments must succinctly capture what the code does.


* **CSS Restrictions:** `:global` style selectors are strictly forbidden.

**3. Agent Workflow & Execution Protocol**

* **Task Pipeline:**
1. Ask clarifying questions regarding the prompt.
2. Formulate and save a task execution plan to a file.
3. Halt and await explicit user confirmation before executing steps.


* **Skill Usage:** When brainstorming, debugging, or planning a spec, ensure the `foundry-vtt` and `titan-codebase` skills are loaded. If the spec touches Svelte files, ensure both `svelte-5` and `foundry-svelte` are also loaded.
* **Task Resolution & Deferment:** Do not defer work by default. Fix issues immediately as they arise unless they involve cascading changes that require architectural decisions.
* **TO DO Management:** Never push off a task as a "TO DO" without explicitly adding it to the designated `TODO.md` document.
* **Spec Completion:** Whenever a specification is completed, the TO DO list must be immediately updated to reflect any completed items.
* **Delegation:** Route all `.js`, `.svelte`, and `.svelte.js` work to the `titan-svelte-dev` subagent (`.claude/agents/titan-svelte-dev.md`). Ensure `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills are loaded prior to execution.
* **State Management:** Always update the `titan-codebase` skill (`.claude/skills/titan-codebase/`) following spec implementations. This must reflect the *current state* of the code, not a historical changelog.
* **Authorization:** Never alter architecture or deviate from defined specifications without verifying subagent findings and obtaining direct user approval.
