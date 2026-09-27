# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

## "Abilitises" category headings

- **Symptom (user-reported 2026-09-26):** several categories are labelled "Abilitises".
- **Status:** not reproduced. The string appears in no source, lang, doc, or readable world/compendium data file, and no
  code pluralises labels by appending "es". The location where it appears on screen is needed.

## Character `mod.damage` and `mod.healing` are never applied

- **Symptom:** a `flatModifier` on selector `mod` with key `damage` or `healing` shows in the character sidebar
  (`CharacterSheetMods.svelte`) but changes no check. Every check's `damageMod`/`healingMod` comes only from
  conditional check modifiers (`getAttackCheckMod`, `getCastingCheckMod`, `getItemCheckMod`); nothing reads
  `system.mod.damage` or `system.mod.healing`.
- **Status:** no compendium content uses them any more (Stoke Rage moved to a conditional check modifier). Open
  decision: add them to every damage/healing check, or remove the two mods from the selector and the sidebar.
