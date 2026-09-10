import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   booleanField,
   fingerprintSchema,
   installSchemaMocks,
   integerField,
   numberField,
   restoreSchemaMocks,
   schemaField,
   sortFingerprint,
   stringField,
} from './helpers/schemaFingerprint.js';

// Characterization (golden-master) gate for the two Character-subtype actor DataModel schemas (Player,
// NPC). A follow-up rebuilds CharacterDataModel/PlayerDataModel/NPCDataModel's static
// _defineDocumentSchema() from shared shape templates via buildSchemaFromShape(); this suite freezes a
// byte-exact fingerprint of the CURRENT hand-written schemas so that refactor can be proven to leave the
// persisted actor data shape unchanged. Player and NPC both extend CharacterDataModel, so fingerprinting
// them covers every field CharacterDataModel itself declares. The schema reads several game settings
// (skill default attributes, the stamina/resolve base multipliers); this suite mocks game.settings.get
// with implausible per-key sentinels so the golden also proves which setting feeds each initial. Dynamic
// import is permitted in tests (the no-dynamic-import rule governs the shipping bundle only).

/**
 * Distinct sentinel values per setting key, so the golden also proves which setting feeds which schema
 * initial. The sentinels are deliberately implausible (not the real world defaults) so a regression that
 * hardcoded a literal instead of reading the setting would fail the gate.
 * @type {object}
 */
const SENTINELS = {
   staminaBaseMultiplier: 111,
   resolveBaseMultiplier: 222,
   'defaultAttribute.arcana': 'SENTINEL_ARCANA',
   'defaultAttribute.athletics': 'SENTINEL_ATHLETICS',
   'defaultAttribute.deception': 'SENTINEL_DECEPTION',
   'defaultAttribute.dexterity': 'SENTINEL_DEXTERITY',
   'defaultAttribute.diplomacy': 'SENTINEL_DIPLOMACY',
   'defaultAttribute.engineering': 'SENTINEL_ENGINEERING',
   'defaultAttribute.intimidation': 'SENTINEL_INTIMIDATION',
   'defaultAttribute.investigation': 'SENTINEL_INVESTIGATION',
   'defaultAttribute.lore': 'SENTINEL_LORE',
   'defaultAttribute.medicine': 'SENTINEL_MEDICINE',
   'defaultAttribute.meleeWeapons': 'SENTINEL_MELEEWEAPONS',
   'defaultAttribute.metaphysics': 'SENTINEL_METAPHYSICS',
   'defaultAttribute.nature': 'SENTINEL_NATURE',
   'defaultAttribute.perception': 'SENTINEL_PERCEPTION',
   'defaultAttribute.performance': 'SENTINEL_PERFORMANCE',
   'defaultAttribute.rangedWeapons': 'SENTINEL_RANGEDWEAPONS',
   'defaultAttribute.stealth': 'SENTINEL_STEALTH',
   'defaultAttribute.subterfuge': 'SENTINEL_SUBTERFUGE',
};

/** @type {object} Holds the dynamically imported actor-type DataModel classes keyed by type. */
const models = {};

beforeAll(async () => {
   // Install the shared Foundry stand-ins (i18n, TypeDataModel, data fields, ApplicationV2), then add
   // this suite's extras: the character schema reads settings sentinels, and TitanActor (pulled in
   // transitively by the check/dialog imports) extends the global Actor document class.
   installSchemaMocks();
   globalThis.game.settings = {
      get: (namespace, key) => SENTINELS[key],
   };
   globalThis.Actor = class {};
   globalThis.CONST = {
      TOKEN_DISPLAY_MODES: { OWNER_HOVER: 50 },
      TOKEN_DISPOSITIONS: { FRIENDLY: 1 },
   };

   // Dynamically import the two Character-subtype actor DataModels against the installed stand-ins.
   models.player = (await import(
      '~/document/types/actor/types/character/types/player/PlayerDataModel.js'
   )).default;
   models.npc = (await import('~/document/types/actor/types/character/types/npc/NPCDataModel.js')).default;
});

afterAll(() => {
   // Remove the stand-ins (and this suite's extra globals) so later suites keep the shared minimal mock.
   restoreSchemaMocks();
   delete globalThis.Actor;
   delete globalThis.CONST;
});

/**
 * The golden fingerprint of a Character stat mod bag (createStatModField): a SchemaField with a single
 * integer `static` sub-field, initial 0.
 * @returns {object} The fingerprint of a stat mod bag.
 */
function statModField() {
   return schemaField({
      static: integerField(0),
   });
}

/**
 * The golden fingerprint of a Character base stat field (createBaseStatField): a SchemaField with an
 * integer `baseValue` (the given initial) and a stat mod bag.
 * @param {number} [initial] - The initial value of the base stat's baseValue sub-field.
 * @returns {object} The fingerprint of a base stat field.
 */
function baseStatField(initial = 0) {
   return schemaField({
      baseValue: integerField(initial),
      mod: statModField(),
   });
}

/**
 * The golden fingerprint of a Character derived stat field (createDerivedStatField): a SchemaField
 * with only a stat mod bag.
 * @returns {object} The fingerprint of a derived stat field.
 */
function derivedStatField() {
   return schemaField({
      mod: statModField(),
   });
}

/**
 * The golden fingerprint of a Character skill field (createSkillSchema): a SchemaField with the skill's
 * default attribute, and its training/expertise base stat fields.
 * @param {string} defaultAttribute - The sentinel default attribute for this skill.
 * @returns {object} The fingerprint of a skill field.
 */
function skillField(defaultAttribute) {
   return schemaField({
      defaultAttribute: stringField(defaultAttribute),
      training: baseStatField(),
      expertise: baseStatField(),
   });
}

/**
 * The golden fingerprint of a Character resource field (createResourceSchema): a SchemaField with an
 * integer `value` (the given initial) and a stat mod bag.
 * @param {number} initial - The initial value of the resource's value sub-field.
 * @returns {object} The fingerprint of a resource field.
 */
function resourceField(initial) {
   return schemaField({
      value: integerField(initial),
      mod: statModField(),
   });
}

/**
 * The golden fingerprint of a nullable, required StringField (createStringField(null)) — the shape of
 * the Character's equipped.armor / equipped.shield id fields.
 * @returns {object} The fingerprint of a nullable StringField.
 */
function nullableStringField() {
   return {
      initial: null,
      kind: 'StringField',
      nullable: true,
      required: true,
   };
}

/**
 * The golden fingerprint of every field CharacterDataModel declares, shared by the Player and NPC
 * goldens (both extend CharacterDataModel and inherit these fields unchanged).
 * @returns {object} The fingerprints of the Character fields keyed by field name.
 */
function characterFields() {
   return {
      documentVersion: numberField(0),
      attribute: schemaField({
         body: baseStatField(1),
         mind: baseStatField(1),
         soul: baseStatField(1),
      }),
      resistance: schemaField({
         reflexes: derivedStatField(),
         resilience: derivedStatField(),
         willpower: derivedStatField(),
      }),
      skill: schemaField({
         arcana: skillField(SENTINELS['defaultAttribute.arcana']),
         athletics: skillField(SENTINELS['defaultAttribute.athletics']),
         deception: skillField(SENTINELS['defaultAttribute.deception']),
         dexterity: skillField(SENTINELS['defaultAttribute.dexterity']),
         diplomacy: skillField(SENTINELS['defaultAttribute.diplomacy']),
         engineering: skillField(SENTINELS['defaultAttribute.engineering']),
         intimidation: skillField(SENTINELS['defaultAttribute.intimidation']),
         investigation: skillField(SENTINELS['defaultAttribute.investigation']),
         lore: skillField(SENTINELS['defaultAttribute.lore']),
         medicine: skillField(SENTINELS['defaultAttribute.medicine']),
         meleeWeapons: skillField(SENTINELS['defaultAttribute.meleeWeapons']),
         metaphysics: skillField(SENTINELS['defaultAttribute.metaphysics']),
         nature: skillField(SENTINELS['defaultAttribute.nature']),
         perception: skillField(SENTINELS['defaultAttribute.perception']),
         performance: skillField(SENTINELS['defaultAttribute.performance']),
         rangedWeapons: skillField(SENTINELS['defaultAttribute.rangedWeapons']),
         subterfuge: skillField(SENTINELS['defaultAttribute.subterfuge']),
         stealth: skillField(SENTINELS['defaultAttribute.stealth']),
      }),
      rating: schemaField({
         awareness: derivedStatField(),
         defense: derivedStatField(),
         melee: derivedStatField(),
         accuracy: derivedStatField(),
         initiative: derivedStatField(),
      }),
      resource: schemaField({
         stamina: resourceField(Math.ceil(3 * SENTINELS.staminaBaseMultiplier)),
         resolve: resourceField(Math.ceil(1 * SENTINELS.resolveBaseMultiplier)),
         wounds: resourceField(0),
      }),
      speed: schemaField({
         stride: baseStatField(5),
         fly: baseStatField(),
         climb: baseStatField(),
         swim: baseStatField(),
         burrow: baseStatField(),
      }),
      mod: schemaField({
         armor: derivedStatField(),
         damage: derivedStatField(),
         healing: derivedStatField(),
         resolveRegain: derivedStatField(),
         woundRegain: derivedStatField(),
      }),
      equipped: schemaField({
         armor: nullableStringField(),
         shield: nullableStringField(),
      }),
      bio: schemaField({
         description: stringField(''),
      }),
   };
}

/**
 * The committed golden fingerprints for the Player and NPC actor DataModel schemas, frozen from the
 * CURRENT hand-written code. Any divergence after the shape-template refactor signals a change to the
 * persisted actor data shape.
 * @type {object}
 */
const GOLDENS = {
   // Player: the Character fields plus xp (earned, initial 0) and inspiration (initial false).
   player: {
      ...characterFields(),
      xp: schemaField({
         earned: integerField(0),
      }),
      inspiration: booleanField(false),
   },

   // NPC: the Character fields, with bio extended by a type StringField, plus a role StringField
   // (initial 'warrior').
   npc: {
      ...characterFields(),
      bio: schemaField({
         description: stringField(''),
         type: stringField(''),
      }),
      role: stringField('warrior'),
   },
};

describe('actor DataModel schema characterization (golden master)', () => {
   it.each([
      ['player'],
      ['npc'],
   ])('the %s schema fingerprint matches the committed golden', (type) => {
      // Fingerprint the live schema and compare it, key-sorted, to the frozen golden.
      const actual = fingerprintSchema(models[type]._defineDocumentSchema());

      expect(actual).toEqual(sortFingerprint(GOLDENS[type]));
   });
});
