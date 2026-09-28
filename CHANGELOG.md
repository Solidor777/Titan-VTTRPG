## Version 2.0.2:
Bug fixes and an Effect Tray refresh.
- The Effect Tray matches the Actors and Items sidebar: nested folders, core folder styling, search, sort, and
  collapse-all, with Create Effect / Create Folder, a pack selector, a lock toggle, and Apply on each effect.
- The Effect Tray list scrolls, and the move-to-folder dialog shows folder names instead of localization keys.
- Conditional check modifiers apply correctly to casting and item checks (spells no longer raise an error), and
  custom-trait and tradition keys match regardless of capitalization or spacing.
- Heavy armor decreases all speeds by 1.
- The Damage and Healing character mods are removed; damage and healing bonuses come from conditional check
  modifiers (use check type Any and selector Any to affect every check).
- Deleting an equipped item no longer raises an error, and the spell sheet's "resisted by" tag shows its resistance.
- Character sheets stay inside their window at any browser zoom, skill rows keep a fixed layout, and sidebar sections
  are spaced from their labels.
- Observers can switch sheet tabs and expand rows.
- Player HUD: icons on skills, resistances, and utilities, and a pressed state for the inspiration toggle.
- Content links have a themed background and border.

## Version 2.0.1:
Bug fix.
- Portrait changes made from a character or item sheet are now saved; they previously reverted on reload.

## Version 2.0.0:
Rewrite for Foundry VTT v13-v14.
- All sheets, dialogs, and chat cards rebuilt on ApplicationV2 with Svelte 5; the TyphonJS dependency is removed.
- Effects are native Active Effects. Legacy effect items on actors convert automatically when a GM loads the world.
- Conditions are Active Effects with built-in rules elements; new Effect HUD and Effect Tray.
- Every chat message (checks, item cards, reports, effects) is a typed chat message.
- Player HUD for quick checks, attacks, and effects.
- Theming system with an in-game theme editor.
- Rules elements support sum operations (add, multiply, set) and an "all" target.
- Checks can be rolled directly from item sheets.
- Drag to reorder lists, and drag rules elements and checks between sheets.
- Number fields accept math expressions, with a leading operator applying a relative change.
- GM tools to export and import compendium content as spreadsheets (XLSX/CSV) and Markdown.

## Version 1.0.0:
Initial Release
