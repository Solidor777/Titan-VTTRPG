# Static Modifier Toggle: Design

## Intent
Players rarely need the static modifier inputs on the Character sheet. A header button lets a character hide them. The choice is saved with the character.

## Goals
- A header button on the Character sheet shows or hides every static modifier input (skills Training and Expertise, Rating, Resource, Speed, Mod, Attribute, Resistance).
- The button icon shows the current state: plus-minus when shown, plus-minus with a slash when hidden.
- The setting is saved in the Actor's flags, so it persists and is per character.
- Default is hidden. This includes every existing character, since none has the flag yet.

## Non-goals
- No change to how totals are computed. Hiding only hides the editor; the static value still counts.
- No change to Item or Active Effect sheets, NPC-specific layouts, or a world-level setting.
- No migration: a missing flag means hidden.

## Chosen layout: "Compact collapse" (mockup A)
Mockup: `docs/superpowers/specs/mockups/static-mod-layout-A.html`.
- Hidden removes each static input and its `+`. Skills, Speed, Attribute and Resistance keep `[base] = [total]`. Rating and Mod show a lone total.
- Stat tracks shrink (skills stat group 124px to 76px). The Skills column header drops the "Mod" label.
- The skill name column takes the freed width (max 195px to 300px). The sidebar narrows from 208px to 184px.

## Approaches
The user fixed the mechanism: a flag on the document that Svelte reads. Within that, the only real choice was layout, and the user picked A over a fixed-width layout (B).

## Calls made without the user (mine, please check)
- Flag path: `flags.titan.showStaticMods` (boolean, missing = false = hidden). Named for the non-default state so a missing flag reads as the default. Name is a proposal.
- Svelte components read the flag through the existing `'document'` context bridge and render with `{#if}`. Whether the bridge exposes flags reactively is not yet verified; the plan must check this first.
- Only users who can edit the Actor see the toggle button, since only they can write the flag. Everyone who can open the sheet sees the effect. This is inferred from Foundry flag permissions, not yet tested.
- The icon is the existing `MOD_ICON` (plus-minus) plus `fa-slash` when hidden, not an eye icon, because the eye already means Awareness on this sheet.
- Layout widths come from CSS custom properties that change with the flag, not duplicated components.

## Left to the builder
- Exact CSS variable names and widths, taken from mockup A and checked against the real sheet.
- Localization keys and tooltip text.
- Tests in the project's style (real Foundry flows, waits at most 1000 ms), and doc updates (`docs/TODO.md`, `titan-codebase` skill).

## Risks
- With hidden as the default, existing e2e tests that read or edit the static inputs will fail until they turn the toggle on through the header button first.
- Every existing character in the user's world becomes hidden on first open; players who use static mods must press the button once.
- The mockup was never checked against the live sheet. Widths may need adjusting.
