# Rules-Element Expressiveness and Compendium Audit Rulings — Design

Sub-project C of the 2026-09-27 backlog close-out. Depends on A (`2026-09-27-advantage-disadvantage-design.md`) and
B (`2026-09-27-conditions-rework-design.md`, for immunity).

## Goal

Every 2026-09-27 compendium audit finding is resolved: the system gains the element capabilities the rules text needs,
and the module's pack sources (`modules/titan-vttrpg-compendium/src/packs`) are corrected to the user's rulings.

Closes the `docs/TODO.md` item "Compendium audit findings awaiting a rules decision".

## Rules source

`docs/TITAN Rules Compendium - Source - 09_26_2026.md` (line numbers per finding below).

## System capabilities

### C1. Stat-referenced values (`flatModifier`)

`flatModifier` gains an optional `valueSource`: `{ selector, key, component, factor, rounding }`, where `component` is
`value` (the stat's derived total) or `baseValue`. When present, the element's contribution is
`round(stat × factor, rounding)` instead of `value`. Sources are read after the stats they reference are final:
the applier resolves stat-referenced elements in a second pass after all other additive/multiplicative appliers, and a
source may not reference a stat that is itself the target of a stat-referenced element (the editor rejects it; the
applier asserts), which rules out cycles. Editor: a "value from stat" toggle revealing selector/key/factor/rounding.

Consumers: Tough (R:4506, max Stamina + Resilience value), Jade Perception (R:8778 Perception training + Metaphysics
training; R:8780 Awareness + ½ Metaphysics training, rounded up).

### C2. Existing-speed guard and per-element minimum

- `flatModifier` gains `existingOnly` (boolean): the element is skipped for any stat whose base value plus
  non-guarded mods is 0 before this element applies. Used on `speed`/`all` elements to modify only speeds a creature
  has.
- `flatModifier` gains `minimum` (integer, optional): the element's contribution is reduced so it never takes the stat
  below `minimum` (it never raises a stat already below it).

Consumers: Force Speed (`existingOnly`), Parch (−5, `existingOnly`, `minimum` 1).

### C3. Weapon-targeted effects (user-directed, 2026-09-27)

Rules grant effects to chosen weapons ("the chosen weapons deal +1 Damage and gain the Magical trait"). The effect stays
an ordinary actor effect and names the weapon it modifies, so durations, turn reports, the effects panel, and the
rules-element pipeline need no second, per-item path. (Item-owned effects were rejected: they need a weapon Effects
tab, per-weapon rules-element processing, and per-item duration ticking, duplicating the actor pipeline. The accepted
cost: an effect stays with its holder if the weapon changes hands mid-duration; these effects last until the start of
the caster's next turn.)

- `conditionalCheckModifier` (checkType `attack`) gains the selector `weapon`, whose key is a weapon **name**, matched
  in camel case like `customTrait` keys (user ruling 2026-09-27: users edit names, not ids). Every weapon whose name
  matches is affected, so two same-named weapons both gain the modifier. The attack-check modifier lookup adds
  `weapon`-selector modifiers keyed by the attacking weapon's name.
- New operation `grantAttackProperty` (selector `weapon`, key: weapon name, `property`: an attack trait or
  `ignoreArmor`): the attack check adds the property to a matching weapon's attack for the check. A trait makes its
  trait-driven options follow (`magical`, `penetrating`, `rend`, …).
- Ignore Armor is not Penetrating (user, 2026-09-28): it ignores all of the target's Armor, as the chat card's Apply
  Damage (Ignore Armor) button does. Attack checks gain an `ignoreArmor` option and parameter (default `false`, set by
  a granted `ignoreArmor` property, editable as a dialog checkbox). When it is set, the attack card's primary Apply
  Damage button applies with `ignoreArmor: true`, and the card shows an "Ignores Armor" tag.
- Dropping an effect onto a weapon row on a character sheet creates the effect on that actor and fills the weapon's name
  into every element of the effect whose selector is `weapon` and whose key is empty. An effect with no such element
  is simply added to the actor. Compendium effects ship those elements with empty keys.
- The rules-element editor's `weapon` key is a free-text name input (placeholder "Chosen when applied").

Consumers: Aether Blades (R:6305: +1 Damage, Magical, Penetrating), Inferno Blades (R:5408: +1 Damage, Magical),
Radiant Blade (R:7338: +1 Damage, Ignore Armor), Sacred Arms of the Arbiter (Weapon) (R:7880: +1 Damage,
Magical, Rend).

### C4. Spell aspects

- `SpellAspects.js` `radius` gains initial value 1 ("adjacent").

### C5. Immunity (from B)

Consumers: Metal Attunement (R:5637, immune to Contaminated), Effulgent Gaze (R:7212, cannot be Blinded).

## Pack rulings (module `src/packs`)

| # | Item | Ruling (user, 2026-09-27) | Change |
|---|---|---|---|
| 1 | Force Slow (R:6653) | Halve the whole speed, rounded up | `mulSum` 0.5 up on speed `all` (was `mulBase` 0.5, no rounding) |
| 2 | Force Speed (R:6651) | Only speeds the creature has | `flatModifier` +5 speed `all`, `existingOnly` |
| 2 | Elder Sibling ×3 (R:8499) | Grants new speeds (intended) | No change |
| 3 | Parch (R:5429) | Minimum 1, only speeds the creature has | `flatModifier` −5, `existingOnly`, `minimum` 1 |
| 3 | Blood Frenzy (R:8934) | Text is clear | Add `flatModifier` speed `all` +5 (`existingOnly`); keep the extra-Action turn message |
| 4 | Abjuration of the Arbiter (R:7696) | Ship (b): −1 default the GM edits per target; (a) logged in TODO.md | Keep `dice` −1 (now applies to Resistance checks via A); description notes the per-target value |
| 5 | Shockwave (R:5129) | Follow the body | range self, `radius` 1, damage 1 scaling, Prone via Resilience |
| 6 | Hunger of Urdokai (R:9765) | Follow the body (10 spaces) | No change (pack already says 10 spaces) |
| 7 | Blood Probe, Conjurer, Pull, Warding of Urdokai (R:8978, 9721, 9835, 9895) | 4:1 | Add check entries modelled on Fangs of Urdokai: Soul (Metaphysics) 4:1, resistance per text (Resilience for Blood Probe; Willpower for the rest); Conjurer's damage = difference, ignores Armor |
| 8 | Metal Attunement, Effulgent Gaze | Immunity | Effects gain `immunity` condition `contaminated` / `blinded`; spells drop the `removeCondition` aspect |
| 9 | Charm Creature, Dominate Creature (R:7403, 7469) | Willpower resistance, no new condition | Add Willpower resistance aspect |
| 10 | Every Attunement spell and effect | Every attunement includes the Attunement trait | Metal Attunement spell/effect gain Attunement; Light Attunement keeps it; verify all Attunements |

## Pack fixes without a ruling (text is unambiguous)

- Lord of Black Flames: roll message keyed to attack trait `ineffective` (was custom trait "Unarmed"); sacred-art flags
  passive only (was action + reaction + passive).
- Empower Soul (R:6376): replace the stray Aether Blades roll message with a turn-start message granting +1 Resolve to
  allies who start their turn within 5 spaces.
- Blue Magister (R:8294): roll message gains its `<strong>Blue Magister:</strong>` prefix and "**+1**"; effect gains
  custom traits Path, Blue Spirit, Apex (R:8283).
- Aether Blades message slip `<strong>+1 Damage and</strong>`; Inferno Blades typo `<strong>Actio</strong>n`.
- Urderic Glaivegun Strike range 1 (R:2926–2929 give none). Urderic Gunshield renamed "Urderic Gun Shield" (R:2964).
- All 62 stray `type` fields on rules elements and trait entries removed.
- Stormcaller's Tempest passive (like The Dragon Awakens and Being of Urdokai).
- Missing aspects: Chained Bolts `extraTargets`; Enlarge/Reduce Creature Resilience resistance; Create Fissure damage 1;
  Grasping Earth duration (until the start of your next turn); Infiltrate Dreams Willpower resistance; Abyssal Darkness
  redundant Reflexes roll message removed (the effect already carries +2 Defense/Reflexes) and Greater Advantage on
  Stealth checks to remain unseen as a situational `advantage` +2 (via A).
- Radiant Blade's "ignore Armor" becomes an `ignoreArmor` property grant (C3); Ignore Armor is not Penetrating.

## Module workflow

Edit JSON in `src/packs`, then `npm run packs:compile` (Foundry must not hold the packs open), `npm run check:links`,
and `npm run validate` (strict build in a running world). `packs/` LevelDB churn is never committed. Commits land on the
module repo's `main`; release is a separate step for the user.

## Testing

- Unit: stat-referenced value resolution and cycle rejection; `existingOnly` and `minimum`; weapon-effect modifiers
  scoped to one weapon; `grantAttackProperty` for a trait and for `ignoreArmor`; an Ignore Armor
  attack's primary Apply Damage ignores all Armor.
- E2E: Tough raises max Stamina by Resilience; Force Speed leaves a 0 Fly speed at 0; Parch floors at 1; an effect
  dropped on a weapon row lands on the actor with that weapon's name filled in and adds +1 damage and its trait to that
  weapon's attack only (a differently named weapon's attack is unchanged); Metal Attunement blocks Contaminated.
- Module: `validate` passes with 0 errors; `check:links` passes.

## Documentation

`docs/TODO.md` (delete the audit item; the two deferred rulings are already logged), `docs/CLOSED_BUGS.md` for any
bug found on the way, the `titan-codebase` skill, and the module README if its workflow changes.

## Delivered by the conditions rework (2026-10-09)

Pack ruling 8 and C5 (Metal Attunement and Effulgent Gaze immunity) shipped with the conditions rework (spec B's
plan) by user ruling on 2026-09-29: the effects carry `immunity` condition elements (`contaminated`, `blinded`) and
the spells no longer offer the `removeCondition` aspect. Ruling 10 (the Attunement trait on Metal Attunement) and the
rest of this spec are unchanged. The "Metal Attunement blocks Contaminated" e2e stays with this spec's plan (it reads
the live packs, which change only after a recompile) and runs against the conditions rework's Immunity Handling
setting at its default, Remove: applying Metal Attunement deletes a Contaminated the actor already has, and a new
Contaminated is refused. The live packs were recompiled and checked in the test world on 2026-10-09: with the
Metal Attunement effect present, applying Contaminated through `toggleStatusEffect` left the actor without it, and
likewise Effulgent Gaze and Blinded
(`.superpowers/sdd/2026-09-29-conditions-rework/task-17-logs/module-live-check.log`).

## As built by the compendium rulings plan

The user's rulings of 2026-10-08 and 2026-10-09 narrowed this spec; the plan
(`docs/superpowers/plans/2026-10-09-compendium-rulings.md`) built these parts, and the rulings govern where they differ:

- **Built (module commits `fccaf01` to `bcb4a2d`):** the pack rulings and fixes listed above, except as noted below;
  Blood Frenzy's +5 on `speed` `all`; condition immunities for the Elder Sibling effects, Blessing of the Arbiter
  (Sleepless) and Tempest Herald (one element per condition id except `dead`); Attunement traits on the Metal Attunement
  spell and the Aether, Force, Metal and Void Attunement effects (ruling 10) and Light on the Light Attunement spell;
  Empower Soul as a turn-start message; Abyssal Darkness's Stealth message as a situational Greater Advantage.
- **Not built, by ruling:** C1 (stat-referenced values: Tough, Jade Perception keep their placeholders, TODO "Operation
  that adds one stat to another"); C2's per-element `minimum` and with it Parch's floor (tabled by the user on
  2026-10-09, TODO "Parch"); C3 (weapon-targeted effects: the four weapon effects keep their placeholders, TODO
  "Weapon-targeted effects"); C4 (radius 1: Shockwave drops its radius aspect, TODO "Spell radius"); C2's
  `existingOnly` (Force Speed, Blood Frenzy and the Elder Sibling effects grant speeds the creature lacks).
- **Changed from the table above:** pack ruling 1 (Force Slow) keeps `mulBase` 0.5, which rounds down (ruling of
  2026-10-08: round down unless the text states otherwise); ruling 2's Force Speed keeps its plain +5; ruling 5
  (Shockwave) removes the radius aspect instead of adding radius 1; ruling 9 adds the Willpower aspect as a custom aspect
  with `resistanceCheck` (no standard aspect carries one); the Urderic Glaivegun keeps Strike range 2.
- **Testing:** no system code changed, so the system suites were not re-run for it. The module's pack content is checked
  in the test world by `.work/live-check-rulings.mjs` (module, git-ignored; log in
  `.superpowers/sdd/2026-10-09-compendium-rulings/logs/live-check.log`): Elder Sibling, Sleepless and Tempest Herald
  refuse their conditions (with Immunity Handling at Remove, an existing Contaminated is removed), and Blood Frenzy adds 5
  to every speed. The suite has no spec that reads the module's packs.
- **Recompile:** the live packs were recompiled from `src/packs` and the module's `validate` ran with 0 errors
  (`.superpowers/sdd/2026-10-09-compendium-rulings/logs/validate.log`).
