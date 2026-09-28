# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.
Completed items are deleted, not marked done.

- One checked-in XLSX test fixture is still needed from the user: a `.xlsx` exported by real Google
  Sheets, derived from this feature's real `titan.effects` export, added as
  `tests/fixtures/spreadsheet/google-sheets-edited.xlsx` with a matching test in `Xlsx.test.js` (see the
  existing "decodes an .xlsx file ... re-saved by real Microsoft Excel" test for the pattern to follow).
  The Excel half is done: `tests/fixtures/spreadsheet/excel-edited.xlsx` was produced by exporting
  titan.effects, editing one cell's value in real Excel 16.0 via COM automation, and re-saving, with a
  passing round-trip test. Google Sheets requires a real Google account signed into a browser, which
  this agent has no access to and should not be given credentials for; the user needs to do this step
  themselves: open the exported .xlsx in Google Sheets, edit one cell's data (not the format), then
  File > Download > Microsoft Excel (.xlsx), and hand the resulting file over.

- Conditions rework to the 2026-09-26 rules (`src/system/Conditions.js`; the compendium Rules journal already has the
  new text). Blinded, Contaminated, Prone, Restrained and Stunned move from a flat -1 to "-1/4 of base value, rounded
  up" (Prone: attackers within 1 space get +1/4, beyond 10 spaces -1/4 per 10 spaces; Prone/Sleeping speed and
  Awareness use "1/2, rounded up"). Frightened becomes Disadvantage on all checks, and Off-Balance is a new condition
  (-1/4 of base Accuracy, Awareness, Melee, Defense, rounded up) that needs a definition, icon and localization.
  Open design questions: how a rules element expresses "-1/4 of base, rounded up", and that the system has no
  Advantage/Disadvantage mechanic at all. The journal text also has an unfixed source typo (Blinded reads "--1/4 of
  their total" instead of "-1/4 of their base value").

- Conditional check modifiers on Resistance checks. `initializeResistanceCheckOptions` reads no actor modifiers, and the
  rules-element editor offers no `resistance` check type, so "all checks" penalties such as Abjuration of the Arbiter's
  -1 dice skip Resistance checks. Needs a `resistance` check type (selector: any or a named resistance) in
  `ItemSheetConditionalCheckModifierSettings.svelte`, the cache builder, and the Resistance check options.

- Heavy armor's remaining rules (Greater Disadvantage on Swim, Fly and Climb checks; no Jump). The -1 to all speeds is
  applied; the rest needs the Advantage/Disadvantage mechanic the system does not have.

- Compendium audit findings awaiting a rules decision (2026-09-27; module `src/packs`, rules 2026-09-26):
  - Force Slow: `mulBase` halves only the base speed and rounds down; the text gives no rounding.
  - Parch: -5 speed "to a minimum of 1"; the clamp is 0.
  - Blood Frenzy: text grants +5 Speed; the effect has only a turn message.
  - Force Speed and the three Elder Sibling effects: +5 to every speed grants Fly/Swim/Burrow/Climb 5 to creatures
    without them; no operation can condition on a non-zero speed.
  - Aether Blades, Inferno Blades, Radiant Blade, Sacred Arms of the Arbiter (Weapon): "+1 Damage" to chosen weapons
    has no element; a conditional modifier would apply to every attack.
  - Abjuration of the Arbiter: the dice penalty misses Resistance checks (see the Resistance-check item above).
  - Jade Perception: Awareness +1/2 Metaphysics Training has no element.
  - Lord of Black Flames: roll message keyed to a custom trait "Unarmed" that no item carries.
  - Empower Soul: roll message carries Aether Blades text.
  - Blue Magister: casting roll message lacks its name prefix.
  - Urderic Glaivegun: Strike range 2 versus no range in the rules.
  - Light Attunement: custom trait "Attunement" versus the rules' "Light" trait.
  - Shockwave: radius 5 versus "each creature adjacent to you".
  - Metal Attunement and Effulgent Gaze: `removeCondition` where the rules grant immunity.
  - Missing spell aspects: Charm Creature, Dominate Creature, Infiltrate Dreams, Enlarge/Reduce Creature (resistance),
    Create Fissure (damage), Grasping Earth (duration), Abyssal Darkness (Defense/Reflexes +2), Chained Bolts (extra
    targets).
  - Urderic Gunshield: document name versus the rules' "Urderic Gun Shield".
  - Stray `type` fields on rules elements and trait entries (harmless, overwritten or unread).
  - Tough: "add your Resilience to maximum Stamina" is a flat +1 placeholder; no operation adds one stat to another.
  - Blood Probe, Conjurer of Urdokai, Pull of Urdokai, Warding of Urdokai: the text describes a check; no check entry.
  - Hunger of Urdokai: description says "Range: 10 spaces"; the rules say Touch.
  - Stormcaller's Tempest: flagged as an action; The Dragon Awakens and Being of Urdokai, which work the same way, are
    passive.

- Effect Tray parity gaps with the core directories (`src/sidebar/tray/`): folders cannot be dragged to reorder or nest
  them (effects can be dragged into folders), and the folder context menu offers only Edit, Rename, and Delete — core's
  Remove Folder / Delete All distinction, Configure Ownership, and Export entries are absent.
