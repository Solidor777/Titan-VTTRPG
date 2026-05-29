# Svelte 5 Migration — Phase 2c: Inputs & Selects (lockstep) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. **Every subagent MUST first invoke `foundry-vtt`, `foundry-svelte`, `svelte-5`** (pure Svelte 5; NOT typhonjs/svelte-4). Checkbox steps. If an Edit/Bash call returns "temporarily unavailable" (classifier), RETRY — not a real error.

**Goal:** Convert the ~29 shared **input/select** primitives to Svelte 5 runes — `bind:value`→`$bindable`, `createEventDispatcher`/forwarded events → callback props — updating consumers in lockstep so the build stays green.

**Architecture:** Same interop rules as Phase 2b (buttons), plus two-way value binding. A runes input exposes `value = $bindable()` and callback props (`onchange`, `onkeyup`, `oninput`); it emits no component events. Legacy parents `bind:value={x}` and pass `onchange={h}` (plain prop) — both work across the legacy↔runes boundary. Select-wrappers (`AttributeSelect`, etc.) wrap `Select`, so **wrappers convert before the `Select` base** (bridge `on:change={onchange}` into still-legacy Select; rebridge to `onchange={onchange}` when Select converts).

**Tech Stack:** Foundry v14, Svelte 5 runes, Vite 5, SCSS. Build green at each commit (the only automated gate — full behavioral test deferred to end of Phase 2 per project decision).

**Working tree:** `C:\FoundryVTT\V14\dev\foundryuserdata\Data\systems\titan` on `feature/svelte5-migration`. Phase 1 + 2a + 2b done.

**Spec:** `docs/superpowers/specs/2026-05-29-svelte5-migration-design.md`. **Worked references in-repo:** buttons `git show ae1615a0` / `2011c00a` (callback-prop + bare-forward chains); editor inputs (commit history) for `bind:value` + persistence.

---

## Conversion recipe

1. **Props:** `export let`→`$props()`; mark the two-way value `value = $bindable(<default>)`. Preserve defaults; `@typedef {object} XxxProps`+`@property` style.
2. **`createEventDispatcher` → callback prop:** remove `const eventDispatcher = createEventDispatcher()`; add the event(s) as callback props (`onchange`, etc.); replace `eventDispatcher('change')` with `onchange?.()`.
3. **Forwarded bare events on a native element** (`<input on:change on:keyup>`): add `onchange`/`onkeyup` callback props and pass them to the element (`<input {onchange} {onkeyup}>`). `bind:value` stays `bind:value`.
4. **Internal handlers** (`on:click={onClick}`, `on:mousedown={preventDefault}`) → `onclick=`/`onmousedown=`.
5. **`$:` blocks → `$derived`/`$effect`.** For a block that VALIDATES/clamps `value` and calls change (see Select below), use a guarded `$effect` so it can't loop.
6. **Wrapping a child input** (select-wrappers wrap `Select`; `AttributeInput`-style wrappers wrap content): if the child is still LEGACY, bridge forwarded events with `on:change={onchange}`; if runes, pass `onchange={onchange}`. `<slot/>`→`{@render children?.()}`.
7. **Consumers (lockstep):** `bind:value={x}` stays as-is; `on:change={h}`→`onchange={h}`, `on:keyup={h}`→`onkeyup={h}`; bare-forwarding intermediaries get their own callback prop + pass-down (chain to handler origin), exactly like the button bare-forward rule.
8. Do NOT change SCSS/markup structure/behavior beyond the above.

### Worked example A — native bound input with forwarded events (`TextInput.svelte`)
Before:
```svelte
<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   export let value = void 0;
   export let disabled = false;
   export let tooltip = void 0;
</script>
<input bind:value {disabled} on:change on:keyup use:tooltipAction={tooltip}/>
```
After:
```svelte
<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @type {{
    *   value?: string,
    *   disabled?: boolean,
    *   tooltip?: (string | TooltipAction),
    *   onchange?: (event: Event) => void,
    *   onkeyup?: (event: KeyboardEvent) => void
    * }}
    */
   let { value = $bindable(void 0), disabled = false, tooltip = void 0, onchange, onkeyup } = $props();
</script>
<input bind:value {disabled} {onchange} {onkeyup} use:tooltipAction={tooltip}/>
```

### Worked example B — `createEventDispatcher` → callback (`CheckboxInput.svelte`)
Before: `const eventDispatcher = createEventDispatcher(); ... function onClick(){ value=!value; eventDispatcher('change'); }` with `<button on:click={onClick} on:mousedown={preventDefault}>`.
After:
```svelte
<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @type {{ value?: boolean, disabled?: boolean, tooltip?: (string|TooltipAction), onchange?: () => void }}
    */
   let { value = $bindable(false), disabled = false, tooltip = void 0, onchange } = $props();

   /** Toggles the value and notifies the change callback. */
   function onClick() {
      value = !value;
      onchange?.();
   }
</script>
<button {disabled} onclick={onClick} onmousedown={preventDefault} use:tooltipAction={tooltip}>
   {#if value === true}<i class="fas fa-check"></i>{/if}
</button>
```

### Worked example C — `Select.svelte` (`$:` validation → guarded `$effect`)
The `$:` block clamps `value` into `options` and fires change. Convert to a guarded `$effect` (it converges: after it sets `value` in-range, the guard is false next run — but DO NOT read `value` to re-trigger unnecessarily; gate with the membership check):
```svelte
<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Text from '~/helpers/svelte-components/Text.svelte';

   /** ... SelectOption typedef unchanged ... */
   /**
    * @type {{ options?: any[], value?: any, disabled?: boolean,
    *          tooltip?: (string|TooltipAction), onchange?: () => void }}
    */
   let { options = void 0, value = $bindable(void 0), disabled = false, tooltip = void 0, onchange } = $props();

   // Clamp value into the available options. Guarded: only writes when out of range, which makes the
   // next run's guard false, so it converges (no loop). Writes happen here (not via a tracked read of value).
   $effect(() => {
      if (!(options?.length > 0)) { return; }
      const first = options[0];
      if (typeof first === 'object') {
         if (!options.find((o) => o.value === value)) { value = first.value; onchange?.(); }
      }
      else if (!options.includes(value)) { value = first; onchange?.(); }
   });
</script>
<select bind:value {disabled} onchange={() => onchange?.()} use:tooltipAction={tooltip}>
   {#each options as option}
      <option value={option.value ?? option} use:tooltipAction={option.tooltip}>
         <Text text={option.label ?? option.value ?? option}/>
      </option>
   {/each}
</select>
```
(If `$effect` writing `value` proves to loop in practice, fall back to validating in the `onchange` handler + an `onMount` initial clamp. Verify build + that selects still default correctly in the final test.)

### Worked example D — select-wrapper (`AttributeSelect.svelte`, wraps `Select`)
`export let value` → `$bindable`; forwarded `on:change` → `onchange` prop; bridge into the child:
```svelte
let { value = $bindable(void 0), allowNone = false, disabled = false, tooltip = void 0, onchange } = $props();
...
<AttributeInput attribute={value}>
   <Select bind:value {disabled} onchange={onchange} {options} {tooltip}/>
</AttributeInput>
```
(If `Select` is still legacy when this wrapper converts, use `on:change={onchange}` instead; rebridge to `onchange={onchange}` when Select converts — wrappers-first.)

---

## Task ordering (wrappers/leaves first, `Select` base last)

### Task 1 — native bound inputs (no child component): `TextInput`, `IntegerInput`, `NumberInput`, `TextAreaInput`, `LabeledTextInput`, `IntegerIncrementInput`, `TopFilter`
One commit per file (or small grouped commits) + their consumers. `NumberInput` has `createEventDispatcher` (recipe rule 2) and several events — handle each. `IntegerIncrementInput` uses `MiniIconButton` (already runes) — pass `onclick` props, not `on:click`.

### Task 2 — dispatch/toggle inputs: `CheckboxInput`, `ImagePicker`
Recipe rule 2 (dispatch→callback). `ImagePicker` also uses `ImageButton` (runes) — pass `onclick`.

### Task 3 — `AttributeInput`, `RarityInput`, `ResistanceInput` (slot wrappers)
These have a `<slot/>` and wrap display; `<slot/>`→`{@render children?.()}`, props→`$props()`.

### Task 4 — select-wrappers (convert BEFORE Select; bridge `on:change={onchange}` into still-legacy Select): `ArmorTraitSelect`, `AttackTraitSelect`, `AttackTypeSelect`, `AttributeSelect`, `CheckDifficultySelect`, `DamageReducedBySelect`, `InventoryItemTypeSelect`, `ModSelect`, `RaritySelect`, `RatingSelect`, `ResistanceSelect`, `ResourceSelect`, `RulesElementOperationSelect`, `ShieldTraitSelect`, `SkillSelect`, `SpeedSelect`
One commit per wrapper (or grouped) + consumers (`on:change={h}`→`onchange={h}`; `bind:value` stays). Many wrap `Select` and bare-forward `on:change` → bridge.

### Task 5 — `Select.svelte` base (LAST)
Convert per Worked Example C. Then REBRIDGE every select-wrapper from Task 4: their `on:change={onchange}` → `onchange={onchange}`. Update any direct `Select` consumers. `grep -rnE "on:change([ />}]|$)" src --include=*.svelte` must show no bare `on:change` pointing at runes `Select`.

### Task 6 — batch verification
`grep -rnE "createEventDispatcher" src --include=*.svelte` (should be gone from converted files); bare `on:change`/`on:keyup`/`on:input` grep clean for converted inputs; `npm run build` green; `npm run eslint` no new errors.

---

## Notes
- `bind:value` works across legacy↔runes; `$bindable()` is required on the runes side for it.
- Loop safety: never write a `$bindable` value inside an `$effect` that depends on that same value without a convergence guard (Select clamp is guarded). Prefer writing in event handlers.
- Document-bound inputs: consumers keep `bind:value={$document.system.x}` + persist via `onchange={() => refreshSystemDocument($document, disabled)}` (was `on:change`).
- After Phase 2c: remaining = interactive tags (`EditDeleteTag`, `TagContainer`), layout primitives (`Tabs`/`FilteredList`/`BorderedColumnList`/`ScrollingContainer`/`LabeledElement`/`Meter`/`RichText`/`Text`), the sheet/dialog/chat component trees, `ChatMessageButton`, then the final `$document`→`doc.data` migration + store-shim removal.
