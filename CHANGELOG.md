## Unreleased:
Conditions follow the 2026-09-26 rules.
**Back up your world before updating. The active GM's first login rewrites every existing condition on world actors,
unlinked tokens, and the actors and tokens in the world's Actor, Scene, and Adventure compendium packs to the new rules
(as the Migration Mode setting allows).**
- Multiply Base and Multiply Sum rules elements can round to the nearest whole number.
- Blinded, Contaminated, Prone, Restrained, and Stunned lower their stats by a quarter of the base value, rounded up,
  instead of by 1. The new Off-Balance condition lowers Accuracy, Awareness, Melee, and Defense the same way.
- Spells can inflict Off-Balance (cost 3) and remove it (cost 2).
- Stat tooltips on the character sheet and Player HUD list condition modifiers, and speed and mod tooltips list
  abilities; skill Training and Expertise tooltips use the same breakdown.
- Frightened gives Disadvantage on every check; Incapacitated and Restrained automatically fail Reflexes checks;
  Blinded and Deafened offer "Relies on Sight" / "Relies on Hearing" Automatic Failures on Perception checks.
- Existing conditions update to the current rules through the world migration, in world actors, unlinked tokens, and
  the world's Actor, Scene, and Adventure compendium packs, which also clears the description text older conditions
  stored, and a condition's description always shows the current text in the reader's language, in the Player HUD and
  in turn-start reports.
- Turn-start reports list the actor's conditions even when it has no other effect. Report entries' tooltips show
  their text instead of an untranslated key, each effect's tooltip leads with its own duration (a condition's shows
  only its description), and turn-start effects show the Turn Start tag instead of the Turn End one.
- Rules-element messages on turn-start and turn-end reports show their text (they rendered blank), and HTML in
  tooltips and rich text is cleaned before it displays, so text stored in a chat message cannot run script in other
  players' clients.
- The Migration Mode setting governs every migration step: "Disabled" skips all of it, as its description says,
  including the conversion of legacy effect items, and "Prompt" changes nothing until the GM confirms. Only the active
  GM migrates, a failed migration no longer stops the Player HUD from loading, and a migration with failures reports
  how many documents failed instead of announcing completion.

## Version 2.1.0:
Advantage and Disadvantage, situational modifiers, and bug fixes.
- **Re-create hotbar macros made before this version:** every hotbar macro created before this version no longer
  matches when you drag it again. Dragging creates a new macro; the old macros still run, so delete an old one by hand
  if it duplicates. Attack Check macros, macros that find their item by document ID, and sheet-toggle macros must be
  re-created because the old ones fail.
- Item names containing apostrophes, backslashes, or double quotes now work in name-identified macros.
- Conditional check modifiers can grant Advantage (Difficulty −1), Greater Advantage (−2), Disadvantage (+1), or
  Greater Disadvantage (+2), summed across sources, or force an Automatic Failure. Check dialogs show the Advantage,
  Automatic Failure, and resulting Difficulty, and check cards tag them.
- Situational modifiers: a conditional check modifier with the Situation selector applies only when ticked in the
  check dialog, and can be limited to one Skill. The card lists the ticked situations.
- Heavy, Encumbering, and Loud armor apply their check rules as situations (swimming, flying, climbing, jumping, and
  staying unheard).
- Resistance Checks read conditional check modifiers.
- The "Show the Check Options Dialog" setting is Never, When Situational Modifiers Apply (the default), or Always;
  the previous on/off choice carries over as Always or When Situational Modifiers Apply.
- An open check dialog follows changes to the character (effects, items) for every field you have not edited.
- An automatically failed check spends no Expertise.
- Penetrating attacks ignore half of the target's Armor; the remaining Armor rounds up.
- Effect Tray folders drag to nest or reorder, and the folder menu offers core's compendium folder entries; its
  folder dialogs open where core's do.

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
