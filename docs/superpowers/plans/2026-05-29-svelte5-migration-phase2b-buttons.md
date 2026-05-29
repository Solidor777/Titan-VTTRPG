# Svelte 5 Migration — Phase 2b: Buttons (lockstep with consumers) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. **Every implementer/reviewer subagent MUST first invoke `foundry-vtt`, `foundry-svelte`, and `svelte-5`** (pure Svelte 5 + ApplicationV2 — NOT typhonjs/svelte-4). Checkbox (`- [ ]`) steps.

**Goal:** Convert the 15 shared **button** primitives to Svelte 5 runes, switching forwarded DOM events to callback props, and update **every consumer in the same commit** (lockstep) so the build stays green.

**Architecture:** Each button forwards `on:click` (bare) to its consumer and keeps an internal `on:mousedown={preventDefault}` handler. Runes components don't forward events — they accept callback props. So each button gains an `onclick` callback prop (passed to its internal `<button>`), its `<slot>` becomes a `children` snippet, and its `export let` props become `$props()`. Every consumer's `<Btn on:click={h}>` becomes `<Btn onclick={h}>` — which works even from still-legacy parents (it's a plain prop pass to a component). Internal handlers (`on:mousedown={preventDefault}`) stay, rewritten as `onmousedown={preventDefault}`.

**Tech Stack:** Foundry v14, Svelte 5 runes, Vite 5, SCSS.

**Working tree:** `C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan` on `feature/svelte5-migration`. Phase 1 + 2a are merged here and the build is green.

**Spec:** `docs/superpowers/specs/2026-05-29-svelte5-migration-design.md`.

---

## Verification model
No unit runner. Per button (task): `npm run build` GREEN and `npm run eslint` no NEW errors in the button + its consumers. After all buttons, a live v14 click-through of representative buttons (rolls, toggles, expand/collapse). Launch: `cd C:\FoundryVTT\V14\dev` then `node foundry/main.js --dataPath=/foundryvtt/V14/dev/foundryuserdata`.

---

## Conversion recipe

**For the button component:**
1. `export let x = d;` → one `$props()` destructure preserving defaults.
2. Add an `onclick` callback prop (and any OTHER genuinely-forwarded bare `on:` event — see note) to `$props()`.
3. `<slot/>` → add `children` to `$props()` and render `{@render children?.()}`.
4. In the markup `<button>`: replace bare forwarded `on:click` with `{onclick}`. Rewrite any INTERNAL handler directive `on:event={fn}` → `onevent={fn}` (e.g. `on:mousedown={preventDefault}` → `onmousedown={preventDefault}`). Keep `use:` actions (`use:tooltipAction`) unchanged.
5. Do NOT change SCSS or behavior.

**Wrapping another button component (interop bridge — VALIDATED in pilot):**
- If the button you're converting WRAPS another button that is **still legacy** (e.g. `MiniIconButton` wraps `IconButton`, `IconLabelButton` wraps `Button`), you CANNOT pass `onclick={onclick}` as a prop to that legacy child (it declares no such prop and would silently no-op). Instead bridge with the event directive on the legacy child: `<LegacyChildButton on:click={onclick} .../>`. Svelte 5 supports `on:` on a legacy child from a runes parent for gradual migration.
- This is why **wrappers convert before bases**. When the wrapped base later converts to runes, update the wrapper's bridge `on:click={onclick}` → `onclick={onclick}` (a one-line edit) as part of the BASE's lockstep — see next rule.
- If the wrapped child is ALREADY runes, pass `onclick={onclick}` directly.

**When converting a BASE button, also rebridge its runes-wrapper consumers:**
- A base's consumers include both legacy components (change `on:click={h}` → `onclick={h}`) AND any already-converted runes wrapper buttons that currently bridge via `on:click={onclick}` — change those to `onclick={onclick}`. Do both in the base's lockstep commit. (E.g. converting `IconButton` must update `MiniIconButton`'s `on:click={onclick}` → `onclick={onclick}`; converting `Button` must update `IconLabelButton`/`ItemCheckButton`/`ResistanceCheckButton`/`SpendResolveButton`/`ToggleButton` once they are runes.)

**Two kinds of consumer — handle each correctly (THIS is where the first attempt broke and shipped non-functional check buttons):**

A consumer either *attaches a handler* or *bare-forwards*. Bare-forwarders form CHAINS that must ALL be fixed in the same lockstep, or the click silently dies at the legacy→runes boundary (build stays green; the button just does nothing).

- **Handler-attaching consumer** — `<Btn on:click={someHandler}>`: change to `<Btn onclick={someHandler}>`. (Works from a legacy parent — plain prop pass to the runes child.)
- **Bare-forwarding intermediary** — `<Btn on:click>` (no `=`; re-emits its own click). A bare `on:click` does NOT survive into a runes child's `onclick` callback prop (the runes child emits no component event). FIX: give the intermediary its own `onclick` and pass it down:
  - Intermediary is **legacy** (not converting yet): add `export let onclick = void 0;` and change `<Btn on:click ...>` → `<Btn {onclick} ...>` (Btn is runes) or keep `on:click={onclick}` (Btn still legacy — runes-parent→legacy-child bridge).
  - Intermediary is **runes**: add `onclick` to `$props()` and pass down per the wrap rules.
  - Then ITS own consumers are the next link — repeat up the chain to the handler-attaching origin (`onclick={fn}`).

> **Known bare-forwarding wrappers** (`grep -rnE "on:click([ />}]|$)" src --include=*.svelte`): the whole `src/document/svelte-components/DocumentOwner*Button.svelte` layer (→Button/AttributeButton/ResistanceButton/IconButton); shared wrappers `ItemCheckButton`/`SpendResolveButton`/`ToggleButton`→Button, `ToggleOptionButton`→MiniButton; plus `SpellSheetEnableAspectButton`→DocumentOwnerButton, `CharacterSheetTabHeaderButton`→MiniButton, `ChatMessageButton` (native). When converting a base (Button/IconButton/MiniButton/AttributeButton/ResistanceButton) you MUST fix the full bare-forward chain above it in the same lockstep. (AttributeButton/ResistanceButton chains were repaired in commit `2011c00a` — use it as the worked reference.)

**For EACH consumer (lockstep, same commit):**
6. Find consumers: `grep -rn "<ButtonName" src --include=*.svelte` (exclude the button's own file) AND bare forwards: `grep -rnE "on:click([ />}]|$)" src --include=*.svelte`.
7. Apply the correct fix per consumer kind (handler-attaching vs bare-forwarding); trace every bare-forward chain to its handler origin and fix all links.
8. **Event modifiers:** if a consumer uses a modifier (`on:click|preventDefault={h}`, `on:click|stopPropagation`, `on:click|once`), runes have no modifiers — wrap the handler instead (e.g. `onclick={(e) => { e.preventDefault(); h(e); }}`). Flag every such case in the report.
9. **Unexpected events:** if a consumer passes `on:mousedown`/`on:contextmenu`/etc. to the button (the survey says only `on:click` is forwarded), STOP and report — the button may need to forward that event too.

### Worked example — `Button.svelte` (+ a consumer)
Button before:
```svelte
<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   export let disabled = false;
   export let tooltip = void 0;
</script>
<button {disabled} on:click on:mousedown={preventDefault} use:tooltipAction={tooltip}>
   <slot/>
</button>
```
Button after:
```svelte
<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @type {{
    *   disabled?: boolean,
    *   tooltip?: (string | TooltipAction),
    *   onclick?: (event: MouseEvent) => void,
    *   children?: import('svelte').Snippet
    * }}
    */
   let { disabled = false, tooltip = void 0, onclick, children } = $props();
</script>
<button {disabled} {onclick} onmousedown={preventDefault} use:tooltipAction={tooltip}>
   {@render children?.()}
</button>
```
Consumer before/after:
```svelte
-  <Button on:click={() => rollCheck()}>{localize('roll')}</Button>
+  <Button onclick={() => rollCheck()}>{localize('roll')}</Button>
```

---

## Task ordering (pilot first, heaviest last)

Do them one task per button (button + all its consumers + build + lint + commit). Order so the recipe is proven on a tiny blast radius before the big ones.

### Task 1 (PILOT): `MiniIconButton` (1 consumer)
- [ ] Convert the button per recipe; update its 1 consumer; build green; eslint clean on touched files; commit `refactor(svelte5): MiniIconButton -> runes callback props`.
- [ ] **STOP and report** after this pilot so the controller can confirm the recipe (consumer-prop interop, modifiers) before scaling.

### Task 2: the remaining 1-consumer buttons — `AttributeButton`, `ExpandButton`, `IconLabelButton`, `ImageButton`, `ResistanceButton`
- [ ] One commit per button (button + its single consumer). Build + lint green each. Watch for `on:mousedown` forwarding on `ImageButton`/`ExpandButton`/`AttributeButton`/`ResistanceButton` (they have an internal `on:mousedown={preventDefault}` like Button — that is INTERNAL, not consumer-facing; confirm).

### Task 3: 2–4 consumer buttons — `ItemCheckButton`, `ResistanceCheckButton`, `SpendResolveButton`, `ToggleButton` (2 each); `MiniButton`, `ToggleOptionButton` (3 each); `CondensedCheckButton` (4)
- [ ] One commit per button + its consumers. Build + lint green each.

### Task 4: `IconButton` (13 consumers)
- [ ] Convert; update all 13 consumers; build + lint green; commit. Report the consumer list and any modifier cases.

### Task 5: `Button` (23 consumers — heaviest)
- [ ] Convert; update all 23 consumers; build + lint green; commit. Report the consumer list and any modifier cases.

### Task 6: batch verification
- [ ] `grep -rn "on:click\|on:mousedown" src --include=*.svelte` and confirm NO remaining `on:` directives target a converted button component (native-element `on:` in still-legacy components is fine).
- [ ] `npm run build` green; `npm run eslint` no new errors across all touched files.
- [ ] **Live v14 (controller hands to user):** click representative buttons — a check roll, a toggle, an expand/collapse, an icon action — confirm they still fire.

---

## Notes & caveats
- A button used by ANOTHER button (e.g. a composite) is handled naturally: when you convert button B that consumes button A (already converted), B's usage of A already passes `onclick` — verify.
- Consumers are still legacy; `<Btn onclick={h}>` is a plain prop pass to a component and works from legacy parents. Do NOT convert consumers to runes here — only swap the event directive.
- After this phase, buttons + tags + labels are runes; inputs/selects, layout primitives, interactive tags, and the sheet/dialog/chat trees remain (later plans), then the final `$document`→`doc.data` migration + shim removal.
