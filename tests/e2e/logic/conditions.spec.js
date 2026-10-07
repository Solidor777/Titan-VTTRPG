import { expect, test } from '../harness.js';
import { clickSheetTab } from '../actions.js';
import { clickRoll, readNewestCheckFlags } from '../checkDialog.js';
import { login, openSheetByUuid } from '../fixtures.js';
import {
   addRulesElement,
   applyCondition,
   createActor,
   createOwnedItem,
   placeToken,
   removeCondition,
   setAttributeBase,
   setSkillTraining,
   shared,
   viewScene,
} from '../flows.js';
import { setClientSetting } from '../settings.js';
import { attachPageErrors, clearChat, closeAllApps } from '../world.js';

/**
 * Condition mechanics against the live derived-data pipeline. Every condition is turned on and off through the token
 * HUD of one placed, linked token. The actor's attributes and the skills its rating bases read are typed into its
 * sheet so every rating base is 8 (a quarter of the base is a whole 2), and one ability carries flat modifiers so
 * each stat sits well above 0; a test captures a baseline, applies the conditions, and asserts each stat's change from
 * that baseline. The sheet's Defense label and its breakdown tooltip show the condition's penalty, the check rules of
 * the conditions (Frightened, Incapacitated, Restrained, Blinded and Deafened) act on rolls made from the sheet's
 * buttons, and the Player HUD shows a condition's definition text, which a description edited in the condition's own
 * sheet does not change.
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

/** @type {string} The description typed into the condition's own sheet. */
const EDITED_DESCRIPTION = 'E2E edited condition description';

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
   test('the HUD shows a condition\'s definition text, and a description edited in its sheet does not change it',
      async () => {
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

         /** @type {import('@playwright/test').Locator} The Blinded row of the Player HUD. */
         const row = page.locator('[data-testid="player-hud-effect-row"]', { hasText: blinded.name });
         await row.click();

         /** @type {import('@playwright/test').Locator} The row's expanded detail. */
         const detail = row.locator('.detail');
         await expect(detail).toContainText(blinded.text);

         // The condition's own sheet is core's effect configuration: TITAN registers its sheet for the `effect`
         // subtype only. Its Details tab holds the description editor.
         await row.getByTestId('player-hud-effect-sheet').click();

         /** @type {import('@playwright/test').Locator} The condition's sheet. */
         const sheet = page.locator('.application.active-effect-config');
         await expect(sheet).toBeVisible();
         await sheet.locator('prose-mirror [contenteditable="true"]').click();
         await page.keyboard.type(EDITED_DESCRIPTION);
         await sheet.locator('button[type="submit"]').click();
         await expect.poll(
            () => page.evaluate(
               (id) => game.actors.get(id).effects.find((effect) => effect.statuses.has('blinded')).description,
               actorId,
            ),
            { message: 'the sheet stored the edited description' },
         ).toContain(EDITED_DESCRIPTION);

         // The edit reached the document and the HUD still shows the definition text.
         await expect(detail).toContainText(blinded.text);
         await expect(detail).not.toContainText(EDITED_DESCRIPTION);
      });
});
