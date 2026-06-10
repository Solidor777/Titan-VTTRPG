# CheckTags on Item Chat Cards (TODO #12, increment 1) Implementation Plan

> **For agentic workers:** On Fable-class models this plan is executed via the
> `mainline-plan-execution` skill (per `~/.claude/CLAUDE.md`), which replaces
> superpowers:subagent-driven-development / superpowers:executing-plans. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** The item chat cards' checks block renders its intrinsic check tags via the shared
`CheckTags` component instead of hand-rendered duplicate markup.

**Architecture:** `ItemChatMessageItemChecks.svelte` (consumed by all 7 item chat cards) swaps its
`.tags` block for `<CheckTags {idx}/>`; the chat tree's nearest `'document'` context is the
message bridge and path parity makes `document.data?.system?.check?.[idx]` resolve on the item
snapshot — no schema, producer, or provider change. Spec:
`docs/superpowers/specs/2026-06-09-path-parity-strategy-and-checktags-chat-design.md`.

**Tech Stack:** Svelte 5 (runes), Foundry v14, SCSS. Branch: `checktags-item-cards`.

---

### Task 1: Swap the hand-rendered tags for CheckTags

**Files:**
- Modify: `src/document/types/item/chat-message/ItemChatMessageItemChecks.svelte`

No new unit test: the component is presentational Svelte verified through the existing e2e
surface (`tests/e2e/item-cards.spec.js` renders every card's checks block; `checks-integration`
rolls from the card). The behavior contract is "same tags, sourced from the shared component".

- [ ] **Step 1: Replace the imports**

Remove `localize`, `OpposedCheckTag`, `ResistedByTag`, `IconStatTag`, `RESOLVE_ICON`, and
`AttributeCheckTag` imports (their only uses are the tags block). Add:

```js
   import CheckTags from '~/document/svelte-components/check/CheckTags.svelte';
```

The surviving imports are `autoSpendResolveChecks`, `ItemCheckButton`, `SpendResolveButton`, and
`getControlledCharacters`.

- [ ] **Step 2: Replace the tags block**

The whole `<div class="tags">…</div>` (including the dead `<div class="stat label"></div>`
placeholder) becomes:

```svelte
         <!--Intrinsic check tags (shared component; config attribute — chat cards have no actor context)-->
         <CheckTags {idx}/>
```

- [ ] **Step 3: Delete the `.tags` styles**

Remove the `.tags { … }` rule (and its nested `.tag`) from the `<style lang="scss">` block; the
shared component carries its own `.check-tags` container.

- [ ] **Step 4: Build and run the unit suite**

Run: `npm run build` → expect clean single-chunk build.
Run: `npm run test` → expect 221 passed.

- [ ] **Step 5: Targeted e2e (if the world is up)**

Run: `npm run build:e2e`, then `npx playwright test item-cards checks-integration --reporter=line`
Expected: all passing. If `/join` is unreachable, defer to the user-gated world launch and say so.

- [ ] **Step 6: Commit**

```bash
git add src/document/types/item/chat-message/ItemChatMessageItemChecks.svelte
git commit -m "refactor: item chat cards render check tags via shared CheckTags (TODO #12, increment 1)"
```

### Task 2: Documentation

**Files:**
- Modify: `docs/TODO.md` (item #12; add the CastingCheckTags item)
- Modify: `.claude/skills/titan-codebase/references/abstractions.md` (CheckTags consumer list)

- [ ] **Step 1: Update TODO #12**

Append to the #12 section's update trail (keep the existing body):

```markdown
- **Update (2026-06-09):** strategy locked **component-driven** (spec
  `specs/2026-06-09-path-parity-strategy-and-checktags-chat-design.md`): each increment converges
  one duplicated cross-surface display onto a shared component reading parity paths; schema work
  only where parity is missing. Increment 1 shipped — `ItemChatMessageItemChecks` renders intrinsic
  check tags via the shared `CheckTags` (zero schema change). Increment 2 = #25 (CastingCheckTags).
```

- [ ] **Step 2: Verify the spell-sheet casting-check surface, then add TODO #25**

Run: `grep -rn "castingCheck" src/document/types/item/types/spell/sheet/` to confirm the spell
sheet hand-renders casting-check tags (adjust the surface list in the new item to what grep
shows). Then add under "Chat message subtypes — related items":

```markdown
### 25. CastingCheckTags: extract the shared casting-check tag display

- **What:** The casting-check tag display (AttributeCheckTag + stats) is hand-rendered on multiple
  spell surfaces: `SpellChatMessage.svelte` (snapshot paths `item.castingCheck.*`),
  `CharacterSheetSpellCastingCheck.svelte` (engine `checkParameters.*`), and the spell sheet
  (verify exact component at pickup).
- **To do:** Extract a shared casting-check tag component per the component-driven path-parity
  strategy (increment 2 of #12); the actor-context consumer passes resolved overrides, document
  consumers read config paths.
- **Found by:** #12 increment-1 gap inventory (2026-06-09).
```

- [ ] **Step 3: Update the titan-codebase skill**

In `.claude/skills/titan-codebase/references/abstractions.md`, the `CheckTags.svelte` entry's
consumer list gains:

```markdown
  3. `ItemChatMessageItemChecks.svelte` — the item chat cards' checks block (all 7 cards); the
     message bridge satisfies the `'document'` context read via snapshot path parity, no
     `attribute` override (chat cards have no actor context).
```

(Renumber the note that previously listed two consumers if it states a count.)

- [ ] **Step 4: Run `graphify update .` and commit**

```bash
git add docs/TODO.md .claude/skills/titan-codebase/references/abstractions.md
git commit -m "docs: record path-parity strategy + increment 1; queue CastingCheckTags (#25)"
```

### Task 3: Final branch review + merge

- [ ] **Step 1:** Dispatch the single final branch reviewer (mainline-plan-execution) over
  `git diff main..HEAD`; fix Critical/Important findings, commit fixes.
- [ ] **Step 2:** Fast-forward merge `checktags-item-cards` into `main`, push, leave the branch
  for user-confirmed deletion.
