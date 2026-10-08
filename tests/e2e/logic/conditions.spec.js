import { expect, test } from '../harness.js';
import { clickSheetTab } from '../actions.js';
import { clickRoll, readNewestCheckFlags } from '../checkDialog.js';
import { forceDice, resetDice } from '../dice.js';
import { login, openSheetByUuid } from '../fixtures.js';
import {
   addCombatant,
   addEffect,
   addRulesElement,
   applyCondition,
   applyConditionRefused,
   createActor,
   controlPlacedToken,
   createCombat,
   createOwnedItem,
   deleteOwnedItem,
   endCombat,
   nextTurn,
   placeToken,
   removeCondition,
   rollInitiative,
   setAttributeBase,
   setDescription,
   setEffectActive,
   setEquipped,
   setSkillTraining,
   shared,
   startCombat,
   viewScene,
} from '../flows.js';
import { setClientSetting, setWorldSetting } from '../settings.js';
import { attachPageErrors, clearChat, closeAllApps } from '../world.js';

/**
 * Condition mechanics against the live derived-data pipeline. Every condition is turned on and off through the token
 * HUD of one placed, linked token. The actor's attributes and the skills its rating bases read are typed into its
 * sheet so every rating base is 8 (a quarter of the base is a whole 2), and one ability carries flat modifiers so
 * each stat sits well above 0; a test captures a baseline, applies the conditions, and asserts each stat's change from
 * that baseline. The sheet's Defense label and its breakdown tooltip show the condition's penalty, the check rules of
 * the conditions (Frightened, Incapacitated, Restrained, Blinded and Deafened) act on rolls made from the sheet's
 * buttons, and a condition opens TITAN's own sheet, whose edited description replaces the definition text in the
 * Player HUD and in the turn-start report. An effect granting immunity suppresses an existing condition or effect,
 * which returns when the immunity ends, and refuses a condition applied through the token HUD, naming the immunity's
 * source.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the actor the conditions are applied to. */
let actorId;
/** @type {string} The uuid of that actor. */
let actorUuid;
/** @type {string} The id of the actor's placed token. */
let tokenId;
/** @type {string[]} The conditions the running test turned on and has not turned off. */
let applied = [];

/** @type {string} A phrase of Blinded's definition text that the report tooltip's HTML holds unbroken. */
const DEFINITION_PHRASE = 'cannot see';

/** @type {string} The description typed into the condition's own sheet. */
const EDITED_DESCRIPTION = 'E2E edited condition description';

/** @type {string} The name of the effect that grants the immunities. */
const WARD_NAME = 'E2E Immunity Ward';

/** @type {string} The name of the effect the ward is immune to. */
const WARDED_EFFECT_NAME = 'E2E Immunity Warded Effect';

/**
 * The rules elements of the boost ability: ratings +5, all attributes +4, all resistances +4, stride speed +6.
 * @type {object[]}
 */
const BOOST_ELEMENTS = [
   {
      selector: 'rating',
      key: 'melee',
      value: 5,
   },
   {
      selector: 'rating',
      key: 'accuracy',
      value: 5,
   },
   {
      selector: 'rating',
      key: 'defense',
      value: 5,
   },
   {
      selector: 'rating',
      key: 'awareness',
      value: 5,
   },
   {
      selector: 'attribute',
      key: 'all',
      value: 4,
   },
   {
      selector: 'resistance',
      key: 'all',
      value: 4,
   },
   {
      selector: 'speed',
      key: 'stride',
      value: 6,
   },
];

/**
 * The Training base values the actor's rating bases read, typed into the Skills tab.
 * @type {Record<string, number>}
 */
const SKILL_TRAINING = {
   dexterity: 8,
   meleeWeapons: 8,
   perception: 8,
   rangedWeapons: 8,
};

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // Body, Mind and Soul 8 and 8 Training in the four skills give Melee, Accuracy, Defense and Awareness base 8 and
   // every Resistance base 12.
   actorId = await createActor(page, {
      name: 'E2E Conditions Actor',
      type: 'player',
   });
   actorUuid = `Actor.${actorId}`;
   for (const attribute of [
      'body',
      'mind',
      'soul',
   ]) {
      await setAttributeBase(page, actorUuid, attribute, 8);
   }
   for (const [skill, value] of Object.entries(SKILL_TRAINING)) {
      await setSkillTraining(page, actorUuid, skill, value);
   }

   /** @type {string} The uuid of the ability that carries the flat modifiers. */
   const boostUuid = `${actorUuid}.Item.${await createOwnedItem(page, actorId, 'ability', 'E2E Condition Boost')}`;
   for (const element of BOOST_ELEMENTS) {
      await addRulesElement(page, boostUuid, element);
   }
   await closeAllApps(page);

   // The typed bases reach every rating and the boost lifts each stat above its base before a baseline is taken.
   /** @type {{attribute: object, rating: object, resistance: object, stride: number}} The stats before a condition. */
   const stats = await snapshot();
   for (const key of [
      'melee',
      'accuracy',
      'defense',
      'awareness',
   ]) {
      expect(stats.rating[key].base, `${key} base`).toBe(8);
      expect(stats.rating[key].value, `${key} value`).toBeGreaterThan(8);
   }
   await viewScene(page, await shared(page, 'scene'));
   tokenId = await placeToken(page, actorId);
});

test.afterEach(async () => {
   // The next test starts from the baseline whatever the last one asserted.
   for (const statusId of applied.toReversed()) {
      await removeCondition(page, tokenId, statusId);
   }
   applied = [];

   // A test that failed before its own endCombat would leave a started combat, which is the viewed combat of every
   // later spec (it has no scene).
   if (await page.evaluate(() => game.combat?.started === true)) {
      await endCombat(page);
   }
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Snapshots the derived stats the condition tests compare.
 * @returns {Promise<{attribute: object, rating: object, resistance: object, stride: number}>} The `{base, value}` maps
 * per attribute, rating and resistance, plus the stride speed value.
 */
function snapshot() {
   return page.evaluate((id) => {
      /** @type {TitanActor} The conditions actor. */
      const actor = game.actors.get(id);

      /**
       * Reads a stat group's base and current value per stat.
       * @param {Record<string, object>} stats - The stat group (attributes, ratings, or resistances).
       * @returns {Record<string, {base: number, value: number}>} Each stat's base and value.
       */
      const read = (stats) => Object.fromEntries(Object.entries(stats).map(([key, stat]) => [
         key,
         {
            base: stat.baseValue,
            value: stat.value,
         },
      ]));
      return {
         attribute: read(actor.system.attribute),
         rating: read(actor.system.rating),
         resistance: read(actor.system.resistance),
         stride: actor.system.speed.stride.value,
      };
   }, actorId);
}

/**
 * Captures the baseline, turns the conditions on through the token HUD, and captures the stats again.
 * @param {string[]} statusIds - The status effect ids to apply.
 * @returns {Promise<{baseline: object, after: object}>} Before and after derived-stat snapshots.
 */
async function applyConditions(statusIds) {
   /** @type {{attribute: object, rating: object, resistance: object, stride: number}} The stats before. */
   const baseline = await snapshot();
   for (const statusId of statusIds) {
      await applyCondition(page, tokenId, statusId);
      applied.push(statusId);
   }
   return {
      baseline,
      after: await snapshot(),
   };
}

/**
 * The change one "-¼ of base value, rounded up" penalty makes: ¾ of the base, rounded up, minus the base.
 * @param {number} base - The stat's base value.
 * @returns {number} The (non-positive) change.
 */
function quarterPenalty(base) {
   return Math.ceil(base * 0.75) - base;
}

/**
 * Asserts that each named rating dropped by one quarter-of-base penalty (times `count`).
 * @param {{baseline: object, after: object}} snapshots - The derived stats before and after the conditions applied.
 * @param {string[]} keys - The rating keys (`melee`, `defense`, and so on) checked against the penalty.
 * @param {number} [count] - How many quarter penalties apply.
 */
function expectRatingPenalty({ baseline, after }, keys, count = 1) {
   for (const key of keys) {
      expect(after.rating[key].value, key)
         .toBe(baseline.rating[key].value + (count * quarterPenalty(baseline.rating[key].base)));
   }
}

test.describe('conditions — derived-stat mechanics', () => {
   test('blinded lowers melee, accuracy, and defense by a quarter of their base', async () => {
      expectRatingPenalty(await applyConditions(['blinded']), [
         'melee',
         'accuracy',
         'defense',
      ]);
   });

   test('contaminated lowers every attribute and resistance by a quarter of its base', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Contaminated. */
      const { baseline, after } = await applyConditions(['contaminated']);
      for (const group of [
         'attribute',
         'resistance',
      ]) {
         for (const [key, stat] of Object.entries(baseline[group])) {
            expect(after[group][key].value, `${group} ${key}`).toBe(stat.value + quarterPenalty(stat.base));
         }
      }
   });

   test('off-balance lowers accuracy, awareness, melee, and defense by a quarter of their base', async () => {
      expectRatingPenalty(await applyConditions(['offBalance']), [
         'accuracy',
         'awareness',
         'melee',
         'defense',
      ]);
   });

   test('stunned lowers defense by a quarter of its base', async () => {
      expectRatingPenalty(await applyConditions(['stunned']), ['defense']);
   });

   test('prone halves speed (round up) and lowers melee and accuracy by a quarter of their base', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Prone. */
      const snapshots = await applyConditions(['prone']);
      expect(snapshots.after.stride).toBe(Math.ceil(snapshots.baseline.stride / 2));
      expectRatingPenalty(snapshots, [
         'melee',
         'accuracy',
      ]);
   });

   test('restrained sets speed to 0 and lowers melee, accuracy, and defense by a quarter of their base', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Restrained. */
      const snapshots = await applyConditions(['restrained']);
      expect(snapshots.after.stride).toBe(0);
      expectRatingPenalty(snapshots, [
         'melee',
         'accuracy',
         'defense',
      ]);
   });

   test('blinded and off-balance each take a quarter of base defense', async () => {
      expectRatingPenalty(await applyConditions([
         'blinded',
         'offBalance',
      ]), ['defense'], 2);
   });

   // Defense base = ceil((Body + Dexterity Training) / 2): Body 8 with Training 4 gives 6 and with Training 6 gives 7.
   // Rounding the summed penalty once would leave 3 and 4; rounding per element leaves 4 and 5.
   for (const [training, base, expected] of [
      [
         4,
         6,
         4,
      ],
      [
         6,
         7,
         5,
      ],
   ]) {
      test(`blinded + off-balance round each penalty alone: base-${base} defense becomes ${expected}`, async () => {
         await setSkillTraining(page, actorUuid, 'dexterity', training);
         try {
            /** @type {{baseline: object, after: object}} The stats before and after both conditions. */
            const { baseline, after } = await applyConditions([
               'blinded',
               'offBalance',
            ]);
            expect(baseline.rating.defense.base, 'defense base').toBe(base);
            expect(after.rating.defense.value - baseline.rating.defense.value, 'defense change')
               .toBe(expected - base);
         }
         finally {
            // The Training goes back to its fixture value through the same sheet input.
            await setSkillTraining(page, actorUuid, 'dexterity', SKILL_TRAINING.dexterity);
         }
      });
   }

   test('sleeping halves awareness (round up)', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Sleeping. */
      const { baseline, after } = await applyConditions(['sleeping']);
      expect(after.rating.awareness.value).toBe(Math.ceil(baseline.rating.awareness.value / 2));
   });

   test('an inert condition (dead) changes no derived stats', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Dead. */
      const { baseline, after } = await applyConditions(['dead']);
      expect(after).toEqual(baseline);
   });
});

test.describe('conditions — the sheet', () => {
   test('Blinded lowers the sheet\'s Defense by a quarter of its base and the breakdown lists Conditions', async () => {
      /**
       * Opens the actor's sheet and reads its Defense label and the label's tooltip content (tippy keeps it on the
       * reference element). The token flows close every open window, so the sheet is opened after each HUD click.
       * @returns {Promise<{label: string, tooltip: string}>} The label's text and the tooltip HTML.
       */
      async function readDefense() {
         /** @type {import('@playwright/test').Locator} The sheet's Defense label. */
         const defenseLabel = (await openSheetByUuid(page, actorUuid)).getByTestId('sheet-rating-defense');
         await expect(defenseLabel).toBeVisible();
         return {
            label: (await defenseLabel.innerText()).trim(),
            tooltip: await defenseLabel.evaluate((element) => element._tippy?.props.content ?? ''),
         };
      }

      /** @type {string} The localized Conditions label. */
      const conditionsLabel = await page.evaluate(() => game.i18n.localize('LOCAL.conditions.text'));

      /** @type {{base: number, value: number}} The Defense rating before the condition. */
      const before = (await snapshot()).rating.defense;
      /** @type {{label: string, tooltip: string}} The sheet before the condition. */
      const plain = await readDefense();
      expect(plain.label, 'the sheet shows the Defense value').toBe(String(before.value));
      expect(plain.tooltip, 'no condition line before the condition').not.toContain(`${conditionsLabel}:`);

      await applyCondition(page, tokenId, 'blinded');
      applied.push('blinded');
      /** @type {{label: string, tooltip: string}} The sheet while Blinded. */
      const blinded = await readDefense();
      expect(blinded.label, 'the sheet shows the lowered Defense')
         .toBe(String(before.value + quarterPenalty(before.base)));
      expect(blinded.tooltip, 'the breakdown lists the condition penalty')
         .toContain(`${conditionsLabel}: ${quarterPenalty(before.base)}`);

      await removeCondition(page, tokenId, 'blinded');
      applied = [];
      /** @type {{label: string, tooltip: string}} The sheet after the condition. */
      const restored = await readDefense();
      expect(restored.label, 'the sheet shows the restored Defense').toBe(String(before.value));
      expect(restored.tooltip, 'the Conditions line leaves with the condition').not.toContain(`${conditionsLabel}:`);
   });
});

test.describe('conditions — check rules', () => {
   /**
    * Clicks a roll button of the actor's sheet and returns the check message the roll posts.
    * @param {import('@playwright/test').Locator} button - The sheet's roll button.
    * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The rolled check's message.
    */
   async function rollFromButton(button) {
      /** @type {number} The chat-message count before the roll. */
      const baseline = await page.evaluate(() => game.messages.size);
      await button.click();
      return readNewestCheckFlags(page, baseline);
   }

   test('Frightened gives an Attribute Check Disadvantage, raising its Difficulty from 4 to 5', async () => {
      await setClientSetting(page, 'getCheckOptions', 'never');
      await applyCondition(page, tokenId, 'frightened');
      applied.push('frightened');

      /** @type {import('@playwright/test').Locator} The actor's sheet. */
      const sheet = await openSheetByUuid(page, actorUuid);

      /** @type {{parameters: object}} The rolled check's message. */
      const flags = await rollFromButton(sheet.getByRole('button', {
         name: 'Body',
         exact: true,
      }).first());
      expect(flags.parameters).toMatchObject({
         advantage: -1,
         baseDifficulty: 4,
         difficulty: 5,
      });
   });

   for (const conditionId of [
      'incapacitated',
      'restrained',
   ]) {
      test(`${conditionId} automatically fails Reflexes checks but not Resilience checks`, async () => {
         await setClientSetting(page, 'getCheckOptions', 'never');
         await applyCondition(page, tokenId, conditionId);
         applied.push(conditionId);

         /** @type {import('@playwright/test').Locator} The actor's sheet. */
         const sheet = await openSheetByUuid(page, actorUuid);
         expect((await rollFromButton(sheet.getByRole('button', {
            name: 'Reflexes',
            exact: true,
         }).first())).parameters.automaticFailure).toBe(true);
         expect((await rollFromButton(sheet.getByRole('button', {
            name: 'Resilience',
            exact: true,
         }).first())).parameters.automaticFailure).toBe(false);
      });
   }

   for (const [conditionId, key, labelKey] of [
      [
         'blinded',
         'reliesOnSight',
         'situationReliesOnSight',
      ],
      [
         'deafened',
         'reliesOnHearing',
         'situationReliesOnHearing',
      ],
   ]) {
      test(`${conditionId} fails a Perception check that relies on the sense, and only when named`, async () => {
         // The condition's situation opens the dialog under the situational setting.
         await setClientSetting(page, 'getCheckOptions', 'situational');
         await applyCondition(page, tokenId, conditionId);
         applied.push(conditionId);

         /** @type {string} The situation's localized label. */
         const label = await page.evaluate((localizationKey) => game.i18n.localize(`LOCAL.${localizationKey}.text`),
            labelKey);

         /** @type {import('@playwright/test').Locator} The actor's sheet, on the Skills tab. */
         const sheet = await openSheetByUuid(page, actorUuid);
         await clickSheetTab(sheet, 'Skills');

         /** @type {import('@playwright/test').Locator} The Perception skill's roll button. */
         const perception = sheet.locator('.skill .check-button button', { hasText: 'Perception' }).first();

         // A Perception check naming the situation.
         await perception.click();

         /** @type {import('@playwright/test').Locator} The Attribute Check dialog. */
         const dialog = page.locator('.application.titan-dialog[id^="titan-attribute-check-dialog-"]');
         await expect(dialog).toBeVisible();
         await dialog.getByTestId(`situation-row-${key}`).locator('[data-testid^="situation-toggle-"]').click();

         /** @type {number} The chat-message count before the roll. */
         const failedBaseline = await clickRoll(dialog, page);
         /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
         const failed = await readNewestCheckFlags(page, failedBaseline);
         expect(failed.parameters.automaticFailure).toBe(true);
         expect(failed.parameters.situations).toEqual([
            {
               key,
               label,
               labelKey,
            },
         ]);

         // A Perception check that does not name the situation.
         await perception.click();
         await expect(dialog).toBeVisible();

         /** @type {number} The chat-message count before the second roll. */
         const unaffectedBaseline = await clickRoll(dialog, page);
         /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
         const unaffected = await readNewestCheckFlags(page, unaffectedBaseline);
         expect(unaffected.parameters.automaticFailure).toBe(false);
      });
   }
});

test.describe('conditions — the Player HUD', () => {
   test('a condition opens TITAN\'s own sheet, and a description edited there is what the HUD and the report show',
      async () => {
         // Turn-start reports list the actor's conditions.
         await setWorldSetting(page, 'reportEffects', true);

         /** @type {{name: string, text: string}} Blinded's localized name and its definition's plain text. */
         const blinded = await page.evaluate(() => {
            /** @type {HTMLDivElement} A detached element that turns the definition HTML into plain text. */
            const holder = document.createElement('div');
            holder.innerHTML = game.i18n.localize('LOCAL.blinded.desc.text');
            return {
               name: game.i18n.localize('LOCAL.blinded.text'),
               text: holder.textContent.trim(),
            };
         });
         await applyCondition(page, tokenId, 'blinded');
         applied.push('blinded');

         // Turn-start reports come from the combat's turns: the conditions actor and an NPC are the combatants, and
         // each Next Turn press moves between the two.
         await createCombat(page);
         await addCombatant(page, tokenId);
         await addCombatant(page, await placeToken(page, await shared(page, 'npc')));
         await forceDice(page, [
            1,
            1,
            6,
            6,
         ]);
         await rollInitiative(page);
         await resetDice(page);
         await startCombat(page);

         // The Player HUD of the conditions actor's controlled token lists the condition; its row shows the definition.
         await controlPlacedToken(page, tokenId);
         /** @type {import('@playwright/test').Locator} The Blinded row of the Player HUD. */
         const row = page.locator('[data-testid="player-hud-effect-row"]', { hasText: blinded.name });
         await row.click();

         /** @type {import('@playwright/test').Locator} The row's expanded detail. */
         const detail = row.locator('.detail');
         await expect(detail).toContainText(blinded.text);

         /**
          * Presses Next Turn until the conditions actor's turn starts, and reads the tooltip of the Blinded tag of the
          * turn-start report it posts.
          * @returns {Promise<string>} The tooltip's HTML.
          */
         const readReportTooltip = async () => {
            /** @type {number} The chat-message count before the turns. */
            const before = await page.evaluate(() => game.messages.size);
            do {
               await nextTurn(page);
            } while (!await page.evaluate((id) => game.combat.combatant.actorId === id, actorId));

            /** @type {string|undefined} The turn-start report's chat-message id. */
            let reportId;
            await expect.poll(async () => {
               reportId = await page.evaluate(
                  (before) => game.messages.contents.slice(before).find((message) => message.type === 'turnStartReport')
                     ?.id,
                  before,
               );
               return reportId;
            }, { message: 'the turn start posted a turn-start report' }).toBeTruthy();

            /** @type {import('@playwright/test').Locator} The report card's Blinded tag. */
            const tag = page.locator(`#chat .message[data-message-id="${reportId}"] .report .effects .tag`).first();
            await expect(tag).toContainText(blinded.name);
            return tag.evaluate((element) => element._tippy?.props?.content);
         };

         // An unedited condition's report tooltip carries the definition (the positive edge of the absence below).
         expect(await readReportTooltip(), 'the unedited report shows the definition').toContain(DEFINITION_PHRASE);

         // The Open Sheet button opens TITAN's condition sheet, not core's effect configuration.
         await row.getByTestId('player-hud-effect-sheet').click();

         /** @type {import('@playwright/test').Locator} The condition's sheet. */
         const sheet = page.locator('.application.titan-condition-sheet');
         await expect(sheet).toBeVisible();
         await expect(page.locator('.application.active-effect-config')).toHaveCount(0);

         // The sheet's description editor receives the text through the shared flow, which reuses the open sheet.
         /** @type {string} The Blinded effect's id. */
         const blindedId = await page.evaluate(
            (id) => game.actors.get(id).effects.find((effect) => effect.statuses.has('blinded')).id,
            actorId,
         );
         await setDescription(page, `${actorUuid}.ActiveEffect.${blindedId}`, EDITED_DESCRIPTION);
         await expect.poll(
            () => page.evaluate(
               (id) => game.actors.get(id).effects.find((effect) => effect.statuses.has('blinded')).description,
               actorId,
            ),
            { message: 'the sheet stored the edited description' },
         ).toContain(EDITED_DESCRIPTION);

         // The HUD shows the edit in place of the definition text.
         await expect(detail).toContainText(EDITED_DESCRIPTION);
         await expect(detail).not.toContainText(blinded.text);

         // The next turn start posts a report whose Blinded tag shows the edit and not the definition text.
         /** @type {string} The edited condition's report tooltip. */
         const edited = await readReportTooltip();
         expect(edited, 'the edited report shows the edit').toContain(EDITED_DESCRIPTION);
         expect(edited, 'the edited report no longer shows the definition').not.toContain(DEFINITION_PHRASE);
         await endCombat(page);
      });
});

test.describe('conditions — immunity', () => {
   /** @type {string} The uuid of the ward effect: permanent, immune to Contaminated and to the warded effect. */
   let wardUuid;
   /** @type {string} The id of the effect the ward is immune to: permanent, Melee +3. */
   let wardedId;

   /**
    * Reads whether the actor shows Contaminated as a status and whether it still holds the condition's effect.
    * @returns {Promise<{active: boolean, held: boolean}>} The status and the held effect.
    */
   function readContaminated() {
      return page.evaluate((id) => {
         /** @type {TitanActor} The conditions actor. */
         const actor = game.actors.get(id);
         return {
            active: actor.statuses.has('contaminated'),
            held: actor.effects.some((effect) => effect.statuses.has('contaminated')),
         };
      }, actorId);
   }

   /**
    * Reads the warded effect's state and the actor's derived Melee.
    * @returns {Promise<{active: boolean, melee: number}>} Whether the effect applies, and the Melee value.
    */
   function readWarded() {
      return page.evaluate(({ id, effectId }) => {
         /** @type {TitanActor} The conditions actor. */
         const actor = game.actors.get(id);
         return {
            active: actor.effects.get(effectId).active,
            melee: actor.system.rating.melee.value,
         };
      }, {
         id: actorId,
         effectId: wardedId,
      });
   }

   /**
    * Reads whether the ward effect is switched on.
    * @returns {Promise<boolean>} True when the ward is not disabled.
    */
   function readWardOn() {
      return page.evaluate(({ id, uuid }) => !game.actors.get(id).effects.get(uuid.split('.').at(-1)).disabled, {
         id: actorId,
         uuid: wardUuid,
      });
   }

   test.beforeAll(async () => {
      // The warded effect comes first: a ward in force would refuse a creation of that name.
      wardedId = await addEffect(page, actorId, WARDED_EFFECT_NAME, { duration: 'permanent' });
      await addRulesElement(page, `${actorUuid}.ActiveEffect.${wardedId}`, {
         key: 'melee',
         selector: 'rating',
         value: 3,
      });

      /** @type {string} The id of the effect that grants the immunities. */
      const wardId = await addEffect(page, actorId, WARD_NAME, { duration: 'permanent' });
      wardUuid = `${actorUuid}.ActiveEffect.${wardId}`;
      await addRulesElement(page, wardUuid, {
         key: 'contaminated',
         operation: 'immunity',
         selector: 'condition',
      });
      await addRulesElement(page, wardUuid, {
         key: WARDED_EFFECT_NAME,
         operation: 'immunity',
         selector: 'effect',
      });

      // Each test switches the ward on itself.
      await setEffectActive(page, actorUuid, wardUuid, false);
      await closeAllApps(page);
   });

   test.afterEach(async () => {
      // The ward ends before the file's afterEach removes the conditions, which expects each to be a status.
      if (await readWardOn()) {
         await setEffectActive(page, actorUuid, wardUuid, false);
      }
   });

   test('an immunity suppresses an existing Contaminated, which returns when the immunity ends', async () => {
      /** @type {{baseline: object, after: object}} The stats before and after Contaminated. */
      const { baseline, after } = await applyConditions(['contaminated']);
      expect(after.attribute.body.value, 'Contaminated lowers Body').toBeLessThan(baseline.attribute.body.value);
      expect(await readContaminated()).toEqual({
         active: true,
         held: true,
      });

      await setEffectActive(page, actorUuid, wardUuid, true);
      await expect.poll(readContaminated, { message: 'suppressed: the status is gone, the effect is kept' })
         .toEqual({
            active: false,
            held: true,
         });
      await expect.poll(async () => (await snapshot()).attribute, { message: 'suppressed: the penalty is gone' })
         .toEqual(baseline.attribute);
      expect((await snapshot()).resistance).toEqual(baseline.resistance);

      await setEffectActive(page, actorUuid, wardUuid, false);
      await expect.poll(readContaminated, { message: 'the immunity ended: Contaminated is a status again' })
         .toEqual({
            active: true,
            held: true,
         });
      await expect.poll(async () => (await snapshot()).attribute, { message: 'the penalty applies again' })
         .toEqual(after.attribute);
   });

   test('a condition the actor is immune to is refused with a notice naming the actor and the source', async () => {
      await setEffectActive(page, actorUuid, wardUuid, true);

      /** @type {string} The refusal notice's text. */
      const notice = await applyConditionRefused(page, tokenId, 'contaminated');

      /** @type {string} The localized name of the refused condition. */
      const conditionName = await page.evaluate(() => game.i18n.localize(
         CONFIG.statusEffects.find((status) => status.id === 'contaminated').name,
      ));
      expect(notice).toContain('E2E Conditions Actor');
      expect(notice).toContain(conditionName);
      expect(notice).toContain(WARD_NAME);
      expect(await readContaminated(), 'the refused condition was not created').toEqual({
         active: false,
         held: false,
      });

      // An immunity covers its own condition only: another condition applies.
      await applyCondition(page, tokenId, 'blinded');
      applied.push('blinded');
   });

   test('an immunity to an effect by name suppresses it, and its modifiers return when the immunity ends', async () => {
      /** @type {{active: boolean, melee: number}} The warded effect before the ward. */
      const before = await readWarded();
      expect(before.active, 'the warded effect applies before the ward').toBe(true);

      await setEffectActive(page, actorUuid, wardUuid, true);
      await expect.poll(readWarded, { message: 'suppressed: the effect stops applying and its Melee +3 leaves' })
         .toEqual({
            active: false,
            melee: before.melee - 3,
         });

      await setEffectActive(page, actorUuid, wardUuid, false);
      await expect.poll(readWarded, { message: 'the immunity ended: the effect applies again' }).toEqual(before);
   });

   test('an equipped item that grants the immunity suppresses Contaminated, which returns when it is unequipped',
      async () => {
         /** @type {string} The id of the equipment the immunity comes from. */
         const charmId = await createOwnedItem(page, actorId, 'equipment', 'E2E Immunity Charm');
         await addRulesElement(page, `${actorUuid}.Item.${charmId}`, {
            key: 'contaminated',
            operation: 'immunity',
            selector: 'condition',
         });

         // The charm is not equipped, so its immunity does not apply and Contaminated is a status.
         await applyConditions(['contaminated']);
         expect(await readContaminated()).toEqual({
            active: true,
            held: true,
         });

         await setEquipped(page, actorId, charmId, true);
         try {
            await expect.poll(readContaminated, { message: 'equipped: the status is gone, the effect is kept' })
               .toEqual({
                  active: false,
                  held: true,
               });
         }
         finally {
            await setEquipped(page, actorId, charmId, false);
         }
         await expect.poll(readContaminated, { message: 'unequipped: Contaminated is a status again' }).toEqual({
            active: true,
            held: true,
         });
      });

   test('an ability that grants the immunity suppresses Contaminated, which returns when the ability is deleted',
      async () => {
         /** @type {boolean} Whether deleting an item asks for confirmation, restored when the test ends. */
         const confirmDeleting = await page.evaluate(() => game.settings.get('titan', 'confirmDeletingItems'));
         await setClientSetting(page, 'confirmDeletingItems', false);

         /** @type {string} The id of the ability that will grant the immunity. */
         const abilityId = await createOwnedItem(page, actorId, 'ability', 'E2E Immunity Ability');
         /** @type {string} The uuid of that ability. */
         const abilityUuid = `${actorUuid}.Item.${abilityId}`;
         try {
            await applyConditions(['contaminated']);
            expect(await readContaminated()).toEqual({
               active: true,
               held: true,
            });

            await addRulesElement(page, abilityUuid, {
               key: 'contaminated',
               operation: 'immunity',
               selector: 'condition',
            });
            await expect.poll(readContaminated, { message: 'the ability grants it: the status is gone' }).toEqual({
               active: false,
               held: true,
            });

            await deleteOwnedItem(page, actorUuid, 'Abilities', abilityUuid);
            await expect.poll(readContaminated, { message: 'the ability is gone: Contaminated is a status again' })
               .toEqual({
                  active: true,
                  held: true,
               });
         }
         finally {
            // A failed test must not leave the ability's immunity on the actor for the tests after it.
            if (await page.evaluate((uuid) => fromUuid(uuid).then((item) => item !== null), abilityUuid)) {
               await deleteOwnedItem(page, actorUuid, 'Abilities', abilityUuid);
            }
            await setClientSetting(page, 'confirmDeletingItems', confirmDeleting);
         }
      });

   test('two effects each immune to the other are both suppressed', async () => {
      /**
       * Reads whether each of the pair applies and the actor's Melee.
       * @returns {Promise<{first: boolean, second: boolean, melee: number}>} Each effect's active state, and Melee.
       */
      const readPair = () => page.evaluate(({ id, firstId, secondId }) => {
         /** @type {TitanActor} The conditions actor. */
         const actor = game.actors.get(id);
         return {
            first: actor.effects.get(firstId).active,
            melee: actor.system.rating.melee.value,
            second: actor.effects.get(secondId).active,
         };
      }, {
         firstId,
         id: actorId,
         secondId,
      });

      // Both effects exist before either grants an immunity: an immunity in force would refuse the other's creation.
      /** @type {string} The id of the first effect, worth Melee +3. */
      const firstId = await addEffect(page, actorId, 'E2E Mutual First', { duration: 'permanent' });
      await addRulesElement(page, `${actorUuid}.ActiveEffect.${firstId}`, {
         key: 'melee',
         selector: 'rating',
         value: 3,
      });

      /** @type {string} The id of the second effect, worth Melee +5. */
      const secondId = await addEffect(page, actorId, 'E2E Mutual Second', { duration: 'permanent' });
      await addRulesElement(page, `${actorUuid}.ActiveEffect.${secondId}`, {
         key: 'melee',
         selector: 'rating',
         value: 5,
      });

      /** @type {{first: boolean, second: boolean, melee: number}} Both effects applying. */
      const both = await readPair();
      expect(both).toMatchObject({
         first: true,
         second: true,
      });

      await addRulesElement(page, `${actorUuid}.ActiveEffect.${firstId}`, {
         key: 'E2E Mutual Second',
         operation: 'immunity',
         selector: 'effect',
      });
      await expect.poll(readPair, { message: 'the second is suppressed, the first still applies' }).toEqual({
         first: true,
         melee: both.melee - 5,
         second: false,
      });

      await addRulesElement(page, `${actorUuid}.ActiveEffect.${secondId}`, {
         key: 'E2E Mutual First',
         operation: 'immunity',
         selector: 'effect',
      });
      await expect.poll(readPair, { message: 'each is immune to the other: both are suppressed' }).toEqual({
         first: false,
         melee: both.melee - 8,
         second: false,
      });
   });
});
