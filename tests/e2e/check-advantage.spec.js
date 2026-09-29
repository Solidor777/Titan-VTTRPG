import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor, showChatLog } from './world.js';
import { forceDice, resetDice } from './dice.js';
import { readNewestCheckFlags } from './checkDialog.js';

/**
 * Advantage, Disadvantage, and Automatic Failure on rolled checks: the parameters the check engine stores, the
 * conditional modifiers that feed them, and the chat card that renders them.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Advantage Actor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.beforeEach(async () => {
   // Rebuild the actor with no items or effects so each test seeds only what it needs.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName)?.delete();
      await Actor.create({
         name: actorName,
         type: 'player',
      });
   }, ACTOR_NAME);
});

test.afterEach(async () => {
   await resetDice(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Rolls an Attribute Check for the spec's actor without the dialog and returns the created message.
 * @param {import('@playwright/test').Page} targetPage - The logged-in page.
 * @param {object} options - Attribute, Skill, and modifier fields passed to `rollAttributeCheck`.
 * @returns {Promise<{id: string, type: string, parameters: object, results: object}>} The new message's id, subtype,
 * parameters, and results.
 */
async function rollAttributeCheck(targetPage, options) {
   /** @type {number} The chat-message count before the roll. */
   const baseline = await targetPage.evaluate(() => game.messages.size);
   await targetPage.evaluate(async ({ actorName, checkOptions }) => {
      await game.actors.getName(actorName).system.rollAttributeCheck(checkOptions);
   }, {
      actorName: ACTOR_NAME,
      checkOptions: options,
   });

   return readNewestCheckFlags(targetPage, baseline, 'attributeCheck');
}

/**
 * Opens the chat log's context menu on a card, returns its entries' labels, and closes it again.
 * @param {import('@playwright/test').Locator} card - The card's list item in the chat log.
 * @returns {Promise<string[]>} The trimmed label of each menu entry.
 */
async function readChatContextMenu(card) {
   await card.locator('.message-header').click({ button: 'right' });

   /** @type {import('@playwright/test').Locator} The open menu's entries. */
   const entries = page.locator('#context-menu li.context-item');
   await expect(entries.first()).toBeVisible();

   /** @type {string[]} The entries' labels. */
   const labels = (await entries.allInnerTexts()).map((text) => text.trim());
   await page.evaluate(() => ui.context?.close({ animate: false }));
   await expect(page.locator('#context-menu')).toHaveCount(0);
   return labels;
}

/**
 * Adds one effect carrying the given rules elements to the spec's actor.
 * @param {import('@playwright/test').Page} targetPage - The logged-in page.
 * @param {object[]} rulesElement - The effect's rules elements (a uuid is generated for each).
 * @returns {Promise<void>} Resolves once the effect exists.
 */
async function seedEffect(targetPage, rulesElement) {
   await targetPage.evaluate(async ({ actorName, elements }) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Advantage Effect',
            type: 'effect',
            system: {
               rulesElement: elements.map((element) => ({
                  ...element,
                  uuid: foundry.utils.randomID(),
               })),
            },
         },
      ]);
   }, {
      actorName: ACTOR_NAME,
      elements: rulesElement,
   });
}

/**
 * Builds a conditional check modifier element: any check type, any selector, Dice +1, unless overridden.
 * @param {object} overrides - Fields replacing the defaults.
 * @returns {object} The element, without a uuid.
 */
function checkModifierElement(overrides) {
   return {
      checkType: 'any',
      key: '',
      modifierType: 'dice',
      operation: 'conditionalCheckModifier',
      selector: 'any',
      skill: '',
      value: 1,
      ...overrides,
   };
}

test.describe('Advantage and Automatic Failure in check options', () => {
   test('options Advantage moves the rolled Difficulty and keeps the base', async () => {
      /** @type {{id: string, parameters: object, results: object}} The check rolled with Advantage. */
      const advantaged = await rollAttributeCheck(page, {
         advantage: 1,
         attribute: 'body',
      });
      expect(advantaged.parameters).toMatchObject({
         advantage: 1,
         baseDifficulty: 4,
         difficulty: 3,
      });

      /** @type {{id: string, parameters: object, results: object}} The check rolled with a -3 Advantage sum. */
      const disadvantaged = await rollAttributeCheck(page, {
         advantage: -3,
         attribute: 'body',
      });
      expect(disadvantaged.parameters).toMatchObject({
         advantage: -3,
         baseDifficulty: 4,
         difficulty: 6,
      });
   });

   test('an automatically failed check rolls its dice but has no successes', async () => {
      // Positive control: the same forced die succeeds without Automatic Failure.
      await forceDice(page, [6]);
      /** @type {{id: string, parameters: object, results: object}} The check rolled without Automatic Failure. */
      const control = await rollAttributeCheck(page, {
         attribute: 'body',
         complexity: 1,
      });
      expect(control.results).toMatchObject({
         successes: 1,
         succeeded: true,
      });

      await forceDice(page, [6]);
      /** @type {{id: string, parameters: object, results: object}} The check rolled with Automatic Failure. */
      const failed = await rollAttributeCheck(page, {
         attribute: 'body',
         automaticFailure: true,
         complexity: 1,
      });
      expect(failed.parameters.automaticFailure).toBe(true);
      expect(failed.results.dice.map((die) => die.base)).toEqual([6]);
      expect(failed.results).toMatchObject({
         criticalSuccesses: 1,
         successes: 0,
         succeeded: false,
      });
   });

   test('an automatically failed check spends no Expertise and its card shows no die raised by it', async () => {
      /** @type {object} One die and 1 Expertise on a 4:1 check, so a rolled 3 takes the Expertise. */
      const checkOptions = {
         attribute: 'body',
         complexity: 1,
         expertiseMod: 1,
      };
      await showChatLog(page);

      // Positive control: without Automatic Failure the Expertise raises the 3, and the card shows "3 + 1".
      await forceDice(page, [3]);
      /** @type {{id: string, parameters: object, results: object}} The normal check's message. */
      const control = await rollAttributeCheck(page, checkOptions);
      expect(control.results.expertiseRemaining).toBe(0);
      expect(control.results.dice.map((die) => die.expertiseApplied)).toEqual([1]);

      /** @type {import('@playwright/test').Locator} The normal card in the chat log. */
      const controlCard = page.locator(`#chat .chat-log li[data-message-id="${control.id}"]`);
      await expect(controlCard.locator('.die', { hasText: '+' })).toHaveCount(1);

      // The same roll with Automatic Failure spends nothing: the Expertise remains and the die shows its face alone.
      await forceDice(page, [3]);
      /** @type {{id: string, parameters: object, results: object}} The automatically failed check's message. */
      const failed = await rollAttributeCheck(page, {
         ...checkOptions,
         automaticFailure: true,
      });
      expect(failed.results.expertiseRemaining).toBe(1);
      expect(failed.results.dice.map((die) => die.expertiseApplied)).toEqual([0]);

      /** @type {import('@playwright/test').Locator} The automatically failed card in the chat log. */
      const failedCard = page.locator(`#chat .chat-log li[data-message-id="${failed.id}"]`);
      await expect(failedCard.locator('.die')).toHaveText(['3']);
      await expect(failedCard.locator('.die', { hasText: '+' })).toHaveCount(0);
   });

   test('an automatically failed card offers no outcome-changing action and styles no die as a success', async () => {
      /** @type {Record<string, string>} The localized labels of the actions a failed card withholds. */
      const labels = await page.evaluate(() => ({
         doubleExpertise: game.i18n.localize('LOCAL.doubleExpertise.text'),
         doubleExpertiseSpendResolve: game.i18n.localize('LOCAL.doubleExpertiseSpendResolve.text'),
         doubleTraining: game.i18n.localize('LOCAL.doubleTraining.text'),
         doubleTrainingSpendResolve: game.i18n.localize('LOCAL.doubleTrainingSpendResolve.text'),
         expertiseRemaining: game.i18n.localize('LOCAL.expertiseRemaining.text'),
         reRollFailures: game.i18n.localize('LOCAL.reRollFailures.text'),
         reRollFailuresSpendResolve: game.i18n.localize('LOCAL.reRollFailuresSpendResolve.text'),
         resetExpertise: game.i18n.localize('LOCAL.resetExpertise.text'),
      }));

      /** @type {string[]} Every context-menu label a failed card withholds (a GM sees both forms of each). */
      const withheld = [
         labels.reRollFailures,
         labels.reRollFailuresSpendResolve,
         labels.doubleExpertise,
         labels.doubleExpertiseSpendResolve,
         labels.doubleTraining,
         labels.doubleTrainingSpendResolve,
      ];

      /** @type {object} Two dice (Body 1 + Training 1), 1 Expertise, and a 4:1 check, so every action applies. */
      const checkOptions = {
         attribute: 'body',
         complexity: 1,
         expertiseMod: 1,
         trainingMod: 1,
      };
      await showChatLog(page);

      // Positive control: without Automatic Failure the card offers every action and styles the 6 a critical success.
      await forceDice(page, [
         6,
         2,
      ]);
      /** @type {{id: string, parameters: object, results: object}} The normal card's message. */
      const control = await rollAttributeCheck(page, checkOptions);

      /** @type {import('@playwright/test').Locator} The normal card in the chat log. */
      const controlCard = page.locator(`#chat .chat-log li[data-message-id="${control.id}"]`);
      await expect(controlCard.locator('.die.critical-success')).toHaveCount(1);
      await expect(controlCard.getByRole('button', { name: labels.resetExpertise })).toBeVisible();
      expect(await readChatContextMenu(controlCard)).toEqual(expect.arrayContaining(withheld));

      // The same roll with Automatic Failure: the card renders its dice and Expertise row but withholds the actions.
      await forceDice(page, [
         6,
         2,
      ]);
      /** @type {{id: string, parameters: object, results: object}} The automatically failed card's message. */
      const failed = await rollAttributeCheck(page, {
         ...checkOptions,
         automaticFailure: true,
      });

      /** @type {import('@playwright/test').Locator} The automatically failed card in the chat log. */
      const failedCard = page.locator(`#chat .chat-log li[data-message-id="${failed.id}"]`);
      await expect(failedCard.locator('.die')).toHaveCount(2);
      await expect(failedCard.getByText(labels.expertiseRemaining)).toBeVisible();
      await expect(failedCard.locator('.die.success, .die.critical-success')).toHaveCount(0);
      await expect(failedCard.getByRole('button', { name: labels.resetExpertise })).toHaveCount(0);

      /** @type {string[]} The failed card's context-menu labels. */
      const failedMenu = await readChatContextMenu(failedCard);
      for (const label of withheld) {
         expect(failedMenu).not.toContain(label);
      }

      // The rolled 6 renders in the resolved failure color.
      await expect.poll(() => failedCard.locator('.die', { hasText: '6' }).evaluate((element) => {
         /** @type {HTMLSpanElement} A probe resolving the failure token to computed rgb() form. */
         const probe = document.createElement('span');
         probe.style.backgroundColor = 'var(--titan-failure-background)';
         element.appendChild(probe);

         /** @type {string} The resolved failure background. */
         const failure = getComputedStyle(probe).backgroundColor;
         probe.remove();
         return getComputedStyle(element.querySelector('button')).backgroundColor === failure;
      }), { message: 'the failed card\'s 6 shows the failure background' }).toBe(true);
   });

   test('a check message without the Advantage fields initializes and renders from its source', async () => {
      /** @type {{messageId: string, parameters: object}} The created card's id and the in-memory document's fields. */
      const result = await page.evaluate(async () => {
         // A complete Attribute Check payload without `advantage`, `automaticFailure`, `baseDifficulty`, and
         // `situations`.
         /** @type {object} The message's system data. */
         const legacySystem = {
            failuresReRolled: false,
            parameters: {
               attribute: 'body',
               attributeDice: 1,
               complexity: 1,
               damageToReduce: 0,
               diceMod: 0,
               difficulty: 4,
               doubleExpertise: false,
               doubleTraining: false,
               expertiseMod: 0,
               extraFailureOnCritical: false,
               extraSuccessOnCritical: false,
               skill: 'none',
               skillExpertise: 0,
               skillTrainingDice: 0,
               totalDice: 1,
               totalExpertise: 0,
               totalTrainingDice: 0,
               trainingMod: 0,
            },
            results: {
               criticalFailures: 0,
               criticalSuccesses: 0,
               damageTaken: 0,
               dice: [
                  {
                     base: 5,
                     expertiseApplied: 0,
                     final: 5,
                  },
               ],
               expertiseRemaining: 0,
               extraSuccesses: 0,
               succeeded: true,
               successes: 1,
            },
         };

         // An in-memory document built from the source takes the initialization path a loaded one takes.
         /** @type {ChatMessage} The in-memory document. */
         const legacy = new ChatMessage.implementation({
            type: 'attributeCheck',
            system: legacySystem,
         });

         /** @type {ChatMessage} The created message, rendered in the chat log. */
         const created = await ChatMessage.create({
            type: 'attributeCheck',
            speaker: ChatMessage.getSpeaker(),
            system: legacySystem,
         });
         return {
            messageId: created.id,
            parameters: {
               advantage: legacy.system.parameters.advantage,
               automaticFailure: legacy.system.parameters.automaticFailure,
               baseDifficulty: legacy.system.parameters.baseDifficulty,
               situations: legacy.system.parameters.situations,
            },
         };
      });

      expect(result.parameters).toEqual({
         advantage: 0,
         automaticFailure: false,
         baseDifficulty: 4,
         situations: [],
      });

      /** @type {import('@playwright/test').Locator} The rendered card's check content. */
      const card = page.locator(`#chat .message[data-message-id="${result.messageId}"] .check-chat-message`);
      await expect(card).toBeAttached();
      await expect(card).toContainText('4:1');
   });
});

test.describe('Advantage and Automatic Failure from conditional modifiers', () => {
   test('an effect with Disadvantage raises a rolled check\'s Difficulty', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, { attribute: 'body' });
      expect(message.parameters).toMatchObject({
         advantage: -1,
         baseDifficulty: 4,
         difficulty: 5,
      });
   });

   test('opposing Advantage sources cancel', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'advantage',
            value: 1,
         }),
         checkModifierElement({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, { attribute: 'body' });
      expect(message.parameters).toMatchObject({
         advantage: 0,
         baseDifficulty: 4,
         difficulty: 4,
      });
   });

   test('an effect with Automatic Failure fails a rolled check', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'automaticFailure',
         }),
      ]);
      await forceDice(page, [6]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, {
         attribute: 'body',
         complexity: 1,
      });
      expect(message.parameters.automaticFailure).toBe(true);
      expect(message.results).toMatchObject({
         successes: 0,
         succeeded: false,
      });
   });
});

/**
 * Overwrites stored parameters on a rolled check's message.
 * @param {import('@playwright/test').Page} targetPage - The logged-in page.
 * @param {string} id - The message's id.
 * @param {object} changes - The parameter fields to overwrite.
 * @returns {Promise<void>} Resolves once the message is updated.
 */
async function updateStoredParameters(targetPage, id, changes) {
   await targetPage.evaluate(async ({ messageId, parameterChanges }) => {
      /** @type {ChatMessage} The rolled check's message. */
      const chatMessage = game.messages.get(messageId);

      /** @type {object} A detached copy of its system data. */
      const system = chatMessage.system.toObject();
      Object.assign(system.parameters, parameterChanges);
      await chatMessage.update({ system });
   }, {
      messageId: id,
      parameterChanges: changes,
   });
}

test.describe('chat card tags', () => {
   test('a Disadvantage tag sits beside the DC, is styled as a tag, and follows the stored level', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, { attribute: 'body' });

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = page.locator(`#chat .message[data-message-id="${message.id}"]`);
      await expect(card.locator('.check-chat-message')).toBeAttached();

      /** @type {string} The localized DC label. */
      const dcLabel = await page.evaluate(() => game.i18n.localize('LOCAL.dc.text'));
      await expect(card.getByTestId('check-chat-dc')).toHaveText(`${dcLabel} 5:0`);

      /** @type {import('@playwright/test').Locator} The Advantage tag. */
      const tag = card.getByTestId('check-chat-advantage');

      /** @type {string} The localized Disadvantage label. */
      const label = await page.evaluate(() => game.i18n.localize('LOCAL.disadvantage.text'));
      await expect(tag).toHaveText(label);

      // The tag's computed colors are the resolved tag tokens.
      /**
       * @type {{background: string, color: string, tagBackground: string, tagFont: string}} The tag's rendered
       * colors beside its resolved token colors.
       */
      const colors = await tag.evaluate((element) => {
         /**
          * Resolves a color token through a throwaway child so the value normalizes to computed rgb() form.
          * @param {string} token - The custom property name.
          * @returns {string} The computed color.
          */
         const resolve = (token) => {
            /** @type {HTMLSpanElement} The probe carrying the token. */
            const probe = document.createElement('span');
            probe.style.color = `var(${token})`;
            element.appendChild(probe);

            /** @type {string} The resolved color. */
            const value = getComputedStyle(probe).color;
            probe.remove();
            return value;
         };

         /** @type {CSSStyleDeclaration} The tag's computed style. */
         const computed = getComputedStyle(element);
         return {
            background: computed.backgroundColor,
            color: computed.color,
            tagBackground: resolve('--titan-tag-background'),
            tagFont: resolve('--titan-tag-font-color'),
         };
      });
      expect(colors.background).not.toBe('rgba(0, 0, 0, 0)');
      expect(colors.background).not.toBe('transparent');
      expect(colors.background).toBe(colors.tagBackground);
      expect(colors.color).toBe(colors.tagFont);

      // Clearing the stored Advantage removes the tag from the same card.
      await updateStoredParameters(page, message.id, { advantage: 0 });
      await expect(tag).toHaveCount(0);
   });

   test('opposing Advantage sources show no tag beside the unchanged DC', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'advantage',
            value: 1,
         }),
         checkModifierElement({
            modifierType: 'advantage',
            value: -1,
         }),
      ]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, { attribute: 'body' });

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = page.locator(`#chat .message[data-message-id="${message.id}"]`);

      // The DC renders first at the unchanged Difficulty; the tag beside it is absent.
      /** @type {string} The localized DC label. */
      const dcLabel = await page.evaluate(() => game.i18n.localize('LOCAL.dc.text'));
      await expect(card.getByTestId('check-chat-dc')).toHaveText(`${dcLabel} 4:0`);

      /** @type {import('@playwright/test').Locator} The Advantage tag. */
      const tag = card.getByTestId('check-chat-advantage');

      // The tag is absent on the net-zero card, appears when the stored level becomes +1, and leaves again at 0.
      await expect(tag).toHaveCount(0);
      await updateStoredParameters(page, message.id, { advantage: 1 });
      await expect(tag).toHaveCount(1);
      await updateStoredParameters(page, message.id, { advantage: 0 });
      await expect(tag).toHaveCount(0);
   });

   test('an automatically failed card shows the Automatic Failure tag and no successes', async () => {
      await seedEffect(page, [
         checkModifierElement({
            modifierType: 'automaticFailure',
         }),
      ]);
      await forceDice(page, [6]);
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, {
         attribute: 'body',
         complexity: 1,
      });

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = page.locator(`#chat .message[data-message-id="${message.id}"]`);

      /** @type {{automaticFailure: string, successes: string}} The localized labels. */
      const labels = await page.evaluate(() => ({
         automaticFailure: game.i18n.localize('LOCAL.automaticFailure.text'),
         successes: game.i18n.localize('LOCAL.successes.text'),
      }));

      /** @type {import('@playwright/test').Locator} The Automatic Failure tag. */
      const tag = card.getByTestId('check-chat-automatic-failure');
      await expect(tag).toHaveText(labels.automaticFailure);
      await expect(card.locator('.results')).toContainText(`0 ${labels.successes}`);

      // Clearing the stored flag removes the tag from the same card.
      await updateStoredParameters(page, message.id, { automaticFailure: false });
      await expect(tag).toHaveCount(0);
   });

   test('the card lists the ticked situations by label', async () => {
      await seedEffect(page, [
         checkModifierElement({
            key: 'Underwater',
            selector: 'situation',
            value: -1,
         }),
      ]);
      // A caller names the situation directly; the dialog is not involved.
      /** @type {{id: string, parameters: object, results: object}} The rolled check's message. */
      const message = await rollAttributeCheck(page, {
         attribute: 'body',
         situations: ['underwater'],
      });
      expect(message.parameters.diceMod).toBe(-1);

      /** @type {import('@playwright/test').Locator} The rolled check's card. */
      const card = page.locator(`#chat .message[data-message-id="${message.id}"]`);
      await expect(card.getByTestId('check-chat-situation')).toHaveText(['Underwater']);

      // Clearing the stored situations removes the block from the same card.
      await updateStoredParameters(page, message.id, { situations: [] });
      await expect(card.getByTestId('check-chat-situations')).toHaveCount(0);
   });
});
