import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { forceDice, resetDice } from './dice.js';
import { readNewestCheckFlags } from './checkDialog.js';
import { settle } from './settle.js';

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
   await settle(targetPage);
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
