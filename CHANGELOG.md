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
