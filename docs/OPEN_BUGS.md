# Open Bugs

Deferred/known bugs. Todos (planned work) live in `docs/TODO.md`; this file is bugs only.

## Character `mod.damage` and `mod.healing` are never applied

- **Symptom:** a `flatModifier` on selector `mod` with key `damage` or `healing` shows in the character sidebar
  (`CharacterSheetMods.svelte`) but changes no check. Every check's `damageMod`/`healingMod` comes only from
  conditional check modifiers (`getAttackCheckMod`, `getCastingCheckMod`, `getItemCheckMod`); nothing reads
  `system.mod.damage` or `system.mod.healing`.
- **Status:** no compendium content uses them any more (Stoke Rage moved to a conditional check modifier). Open
  decision: add them to every damage/healing check, or remove the two mods from the selector and the sidebar.
