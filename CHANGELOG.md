## Version 2.2.0:
Conditions follow the 2026-09-26 rules.
**Back up your world before updating. The active GM's first login rewrites every existing condition on world actors,
unlinked tokens, and the actors and tokens in the world's Actor, Scene, and Adventure compendium packs to the new rules,
and hides from unlinked tokens the converted effects their own changes replace (as the Migration Mode setting allows).**
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
  in turn-start reports. An unlinked token whose actor was deleted, on a scene or in a Scene compendium, is not
  migrated: Foundry cannot update it. If it holds an outdated condition or legacy effect item, the migration reports
  it as a failure that names its scene and says to delete the token, and the migration prompt or the failure returns
  on every load until the token is deleted.
- Turn-start reports list the actor's conditions even when it has no other effect. Report entries' tooltips show
  their text instead of an untranslated key, each effect's tooltip leads with its own duration (a condition's shows
  only its description), and turn-start effects show the Turn Start tag instead of the Turn End one.
- Rules-element messages on turn-start and turn-end reports show their text (they rendered blank), and HTML in
  tooltips and rich text is cleaned before it displays, so text stored in a chat message cannot run script in other
  players' clients.
- The Migration Mode setting governs every migration step: "Disabled" skips all of it, as its description says,
  including the conversion of legacy effect items, and "Prompt" changes nothing until the GM confirms. Only the active
  GM migrates, a failed migration no longer stops the Player HUD from loading, and a migration with failures reports
  how many failures it had instead of announcing completion, counting writes the world did not store, compendium
  packs it could not read or lock again, and unlinked tokens whose actor was deleted that still hold work.
- Legacy effect items convert into effects that keep the item's ID, so an unlinked token's own changes to its actor's
  effect items carry over to the converted effects. The migration hides an actor's converted effect from each unlinked
  token that removed or replaced the original item, or already holds its own converted copy, including effects earlier
  versions converted: such a token no longer shows a removed effect or a second copy.
- New Immunity rules element: an item or effect can make a character immune to a condition or to an effect by name.
  Applying it is refused with a notification. A condition or effect the character already has is removed when the
  immunity arrives (new world setting "Existing Effects on Gaining Immunity": Remove, the default; two effects each
  immune to the other stay, suppressed) or kept suppressed until the immunity ends (Suppress: its modifiers stop
  applying; immunities it grants still apply).
- Other modules and systems can store core's `base` Active Effect on a TITAN actor, item or token. TITAN keeps it and
  loads it after a reload. The character sheet's Effects tab and the Player HUD's effects panel list it as a plain row
  (name, image, active toggle, open and delete controls) that opens in Foundry's default effect sheet, and the Effect
  Tray lists one held in a world or module pack. TITAN's stats, durations, immunities and reports ignore it, and core
  still applies its native changes. Before, creating one failed and a stored one stopped the world from loading.
- A condition or effect suppressed by an immunity shows a "Suppressed" tag naming the immunity, and a dimmed row, on
  the character sheet, in the Player HUD effects panel, and in turn-start and turn-end reports; its duration keeps
  running while suppressed.
- Attack checks read the target's conditions: a Prone target within 1 space raises the attacker's Melee or Accuracy
  by a quarter of its base, one beyond 10 spaces lowers Accuracy by a quarter per 10 spaces, and an Incapacitated
  target's Difficulty is 2. The dialog and the chat card list them; a Melee or Accuracy typed into the dialog
  replaces the rating, bonus included, and drops its entry. The dialog keeps the target's conditions and distance read
  when it opens, and the bonuses follow the attacker's ratings while it is open. A GM who targets nothing has their
  controlled tokens stand in as the target, except the attacker's own tokens; a token of the attacker's own actor that
  the GM targets explicitly is still the target.
- Falling Unconscious also applies Prone and Incapacitated, each only if absent and unless the character is immune to
  it; removing Unconscious leaves Prone and Incapacitated.
- Resolve is spent for doubled Training, doubled Expertise and an item check's Resolve Cost on every kind of check.
- On a casting card, disabled spell aspects and custom aspects that cost nothing no longer scale. A scaling custom aspect
  costs at least 1, and the spell sheet warns about one that costs nothing. The owner of a character can spend and refund
  extra successes on a casting card that a GM rolled; the GM validates and applies each change.
- Only the combat turn hooks can be fired on other clients through the system socket, and only by a GM or the owner of
  the combatant whose turn ends; before, any client could fire any hook on every client.
- A failed Resistance or opposed check never takes negative damage. Rend no longer destroys Magical Armor when the
  attack is not Magical, an Ineffective attack inflicts at most 1 Wound, Vicious adds a Wound, and the Multi-Attack
  toggle of a weapon is stored. Apply Half Damage applies at least 1 damage on every card.
- Resource values typed on the character sheet or the Player HUD are limited to 0 and the maximum.
- The Multiply Base, Multiply Sum and Set Sum editors offer the Mod selector (Multiply Base also the All key), and mods
  have a base value. The worn armor and the shield's Defense count in the running total that Multiply Sum and Set Sum
  read.
- A turn start no longer posts a blank report when only expired effects were removed. The apply and revert buttons of
  persistent damage, fast healing and resolve regain reports update the report's snapshot, Revert Resolve Regain spends
  the Resolve held, and the Remove Expired Effects button works. Beginning a combat runs the first combatant's turn
  start, and Next Round, Previous Round and Previous Turn from round 1 run the same turn hooks as Next Turn.
- An open sheet's name input follows a rename made elsewhere.

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
