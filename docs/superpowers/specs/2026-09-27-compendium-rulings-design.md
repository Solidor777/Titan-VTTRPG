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

### C3. Weapon-borne effects

Rules grant effects to chosen weapons ("the chosen weapons deal +1 Damage and gain the Magical trait"). Effects become
applicable to weapon items:

- A weapon item can own `effect`-subtype Active Effects: dropping an effect (from the Effect Tray, a sheet, or the
  compendium) onto a weapon row on a character sheet or onto a weapon sheet creates it on the weapon. The weapon sheet
  and the character-sheet weapon row list the weapon's effects (name, duration, delete).
- Attack checks with a weapon add the weapon's active effects' `conditionalCheckModifier` elements (checkType
  `attack` / `any`) for that weapon's attacks only, and a new `grantAttackTrait` element (key: an attack trait)
  adds the trait to that weapon's attacks for the check.
- Weapon-effect durations tick with the owning actor's turn/initiative processing like actor effects.

Consumers: Aether Blades (R:6305: +1 Damage, Magical, Penetrating), Inferno Blades (R:5408: +1 Damage, Magical),
Radiant Blade (R:7338: +1 Damage, ignore Armor → Penetrating), Sacred Arms of the Arbiter (Weapon) (R:7880: +1 Damage,
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
- Radiant Blade's "ignore Armor" becomes the Penetrating trait grant (C3).

## Module workflow

Edit JSON in `src/packs`, then `npm run packs:compile` (Foundry must not hold the packs open), `npm run check:links`,
and `npm run validate` (strict build in a running world). `packs/` LevelDB churn is never committed. Commits land on the
module repo's `main`; release is a separate step for the user.

## Testing

- Unit: stat-referenced value resolution and cycle rejection; `existingOnly` and `minimum`; weapon-effect modifiers
  scoped to one weapon; `grantAttackTrait`.
- E2E: Tough raises max Stamina by Resilience; Force Speed leaves a 0 Fly speed at 0; Parch floors at 1; an effect
  dropped on a weapon adds +1 damage to that weapon's attack only; Metal Attunement blocks Contaminated.
- Module: `validate` passes with 0 errors; `check:links` passes.

## Documentation

`docs/TODO.md` (delete the audit item; the two deferred rulings are already logged), `docs/CLOSED_BUGS.md` for any
bug found on the way, the `titan-codebase` skill, and the module README if its workflow changes.
