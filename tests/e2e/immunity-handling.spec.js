import { expect, test } from './harness.js';
import { DURATION_PERMANENT } from '~/system/DurationTypes.js';
import { login } from './fixtures.js';
import {
   addEffect,
   addRulesElement,
   applyCondition,
   createActor,
   createOwnedItem,
   createWorldItem,
   dragItemOntoSheet,
   openSidebarTab,
   placeToken,
   readServerDocument,
   setEquipped,
   setAttributeBase,
   shared,
   toggleTokenLink,
   viewScene,
} from './flows.js';
import { withClients } from './multiClient.js';
import { setWorldSetting } from './settings.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * The Immunity Handling setting on the live pipeline. Remove (the default) deletes a condition the actor already has
 * when an immunity to it arrives, on a new effect, on an item being equipped, or on the world actor of an unlinked
 * token holding the condition itself, and notifies with the immunity's source. Suppress keeps the condition,
 * suppressed, and switching the setting to Remove then deletes it while a mutually immune pair of effects, which no
 * order can decide, stays suppressed. The settings window lists the setting localized.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The id of the scene the tokens stand on. */
let sceneId;

/** @type {string} Name of the Active Effect granting the Contaminated immunity. */
const WARD_NAME = 'E2E Immunity Handling Ward';

/** @type {string} Name of the armor whose rules elements grant the Contaminated immunity while equipped. */
const ARMOR_NAME = 'E2E Immunity Handling Armor';

/** @type {string} Name of the world ability whose rules elements grant the Contaminated immunity. */
const ABILITY_NAME = 'E2E Immunity Handling Ability';

/** @type {string} Name of the equipment whose rules elements grant the Contaminated immunity while equipped. */
const CHARM_NAME = 'E2E Immunity Handling Charm';

/**
 * An immunity to Contaminated.
 * @type {object}
 */
const CONTAMINATED_IMMUNITY = {
   key: 'contaminated',
   operation: 'immunity',
   selector: 'condition',
};

/**
 * What a test works on: a Character with a token, Body 8.
 * @typedef {object} Subject
 * @property {string} actorId - The world actor's id.
 * @property {string} actorUuid - The world actor's uuid.
 * @property {string} name - The actor's name.
 * @property {string} tokenId - The id of the actor's placed token.
 */

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   sceneId = await shared(page, 'scene');
   await viewScene(page, sceneId);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Creates a Character with Body 8 and places its token, optionally unlinked.
 * @param {string} name - The actor's name.
 * @param {object} [options] - Optional token settings.
 * @param {boolean} [options.unlinked] - Whether the token is unlinked from the actor.
 * @returns {Promise<Subject>} Resolves with the created Character and its token.
 */
async function createSubject(name, { unlinked = false } = {}) {
   /** @type {string} The id of the new actor. */
   const actorId = await createActor(page, {
      name,
      type: 'player',
   });
   /** @type {string} The uuid of the new actor. */
   const actorUuid = `Actor.${actorId}`;
   await setAttributeBase(page, actorUuid, 'body', 8);
   if (unlinked) {
      await toggleTokenLink(page, actorId);
   }
   return {
      actorId,
      actorUuid,
      name,
      tokenId: await placeToken(page, actorId),
   };
}

/**
 * Reads the actor of a placed token: its Body, whether it shows Contaminated as a status, and whether it holds a
 * Contaminated effect.
 * @param {Subject} subject - The Character whose token is read.
 * @returns {Promise<{active: boolean, body: number, held: boolean}>} The snapshot.
 */
function readContaminated(subject) {
   return page.evaluate((tokenId) => {
      /** @type {TitanActor} The token's actor. */
      const actor = canvas.scene.tokens.get(tokenId).actor;
      return {
         active: actor.statuses.has('contaminated'),
         body: actor.system.attribute.body.value,
         held: actor.effects.some((effect) => effect.statuses.has('contaminated')),
      };
   }, subject.tokenId);
}

/**
 * Applies Contaminated through the token HUD and returns the Body it left.
 * @param {Subject} subject - The Character that takes the condition.
 * @returns {Promise<{baseline: number, penalized: number}>} Body before and after.
 */
async function applyContaminated(subject) {
   /** @type {number} Body before the condition. */
   const baseline = (await readContaminated(subject)).body;
   await applyCondition(page, subject.tokenId, 'contaminated');

   /** @type {{active: boolean, body: number, held: boolean}} The state with the condition. */
   const penalized = await readContaminated(subject);
   expect(penalized, 'Contaminated applies and lowers Body').toEqual({
      active: true,
      body: expect.any(Number),
      held: true,
   });
   expect(penalized.body).toBeLessThan(baseline);
   return {
      baseline,
      penalized: penalized.body,
   };
}

/**
 * Adds a permanent effect to the subject's actor that grants the Contaminated immunity.
 * @param {Subject} subject - The Character that receives the ward.
 * @returns {Promise<string>} The uuid of the ward effect.
 */
async function addWard(subject) {
   /** @type {string} The id of the new ward effect. */
   const wardId = await addEffect(page, subject.actorId, WARD_NAME, { duration: DURATION_PERMANENT });
   /** @type {string} The uuid of the new ward effect. */
   const wardUuid = `${subject.actorUuid}.ActiveEffect.${wardId}`;
   await addRulesElement(page, wardUuid, CONTAMINATED_IMMUNITY);
   return wardUuid;
}

/**
 * Reads whether the server's copy of an actor or token holds a Contaminated effect.
 * @param {string} uuid - The uuid of the world actor, or of the token for an unlinked token's own effects.
 * @returns {Promise<boolean>} True when a stored effect carries the Contaminated status.
 */
async function serverHoldsContaminated(uuid) {
   /** @type {object} The stored document; an unlinked token keeps its own effects in its delta. */
   const stored = await readServerDocument(page, uuid);

   // A delta entry that hides an inherited effect is a tombstone and carries no statuses.
   return (stored.delta ?? stored).effects.some((effect) => effect.statuses?.includes('contaminated') === true);
}

/**
 * Reads the names of the effects the server stores for an actor or an unlinked token.
 * @param {string} uuid - The uuid of the world actor, or of the token for an unlinked token's own effects.
 * @returns {Promise<string[]>} The stored effects' names; a tombstone entry in a token delta has none and is left out.
 */
async function serverEffectNames(uuid) {
   /** @type {object} The stored document; an unlinked token keeps its own effects in its delta. */
   const stored = await readServerDocument(page, uuid);
   return (stored.delta ?? stored).effects.filter((effect) => effect._tombstone !== true).map((effect) => effect.name);
}

/**
 * Reads the info notices showing, and dismisses them with a click, as a user does, so they do not cover the token.
 * @param {string} text - Text the wanted notice contains.
 * @returns {Promise<string>} The notice's text.
 */
async function takeNotice(text) {
   /** @type {import('@playwright/test').Locator} The matching notice. */
   const notice = page.locator('#notifications .notification.info', { hasText: text });
   await expect(notice).toHaveCount(1);

   /** @type {string} The notice's text. */
   const shown = (await notice.innerText()).trim();
   await notice.click();
   await expect(notice).toHaveCount(0);
   return shown;
}

test('Remove (the default) deletes an existing condition when an immunity effect arrives, naming its source',
   async () => {
      expect(await page.evaluate(() => game.settings.settings.get('titan.immunityHandling').default)).toBe('remove');
      await setWorldSetting(page, 'immunityHandling', 'remove');

      /** @type {Subject} The Character the test works on. */
      const subject = await createSubject('E2E Immunity Handling Effect Actor');
      /** @type {{baseline: number}} Body before the condition. */
      const { baseline } = await applyContaminated(subject);
      expect(await serverHoldsContaminated(subject.actorUuid), 'the server holds the condition').toBe(true);

      await addWard(subject);
      await expect.poll(() => readContaminated(subject), { message: 'removed: the effect and its penalty are gone' })
         .toEqual({
            active: false,
            body: baseline,
            held: false,
         });
      expect(await serverHoldsContaminated(subject.actorUuid), 'the server copy no longer holds it').toBe(false);

      /** @type {string} The removal notice. */
      const notice = await takeNotice(WARD_NAME);
      expect(notice).toContain(subject.name);
      expect(notice).toContain('Contaminated');
   });

test('Remove deletes an existing condition when an item granting the immunity is equipped', async () => {
   await setWorldSetting(page, 'immunityHandling', 'remove');

   /** @type {Subject} The Character the test works on. */
   const subject = await createSubject('E2E Immunity Handling Item Actor');
   /** @type {string} The id of the new equipment. */
   const charmId = await createOwnedItem(page, subject.actorId, 'equipment', CHARM_NAME);
   await addRulesElement(page, `${subject.actorUuid}.Item.${charmId}`, CONTAMINATED_IMMUNITY);

   // The charm is not equipped, so its immunity does not apply and Contaminated stays.
   /** @type {{baseline: number}} Body before the condition. */
   const { baseline } = await applyContaminated(subject);

   await setEquipped(page, subject.actorId, charmId, true);
   await expect.poll(() => readContaminated(subject), { message: 'equipping the charm removed Contaminated' })
      .toEqual({
         active: false,
         body: baseline,
         held: false,
      });
   expect(await serverHoldsContaminated(subject.actorUuid), 'the server copy no longer holds it').toBe(false);
   await takeNotice(CHARM_NAME);
});

test('Remove deletes an existing condition when armor granting the immunity is equipped in its slot', async () => {
   await setWorldSetting(page, 'immunityHandling', 'remove');

   /** @type {Subject} The Character the test works on. */
   const subject = await createSubject('E2E Immunity Handling Armor Actor');
   /** @type {string} The id of the new armor item. */
   const armorId = await createOwnedItem(page, subject.actorId, 'armor', ARMOR_NAME);
   await addRulesElement(page, `${subject.actorUuid}.Item.${armorId}`, CONTAMINATED_IMMUNITY);
   /** @type {{baseline: number}} Body before the condition. */
   const { baseline } = await applyContaminated(subject);

   await setEquipped(page, subject.actorId, armorId, true);
   await expect.poll(() => readContaminated(subject), { message: 'equipping the armor removed Contaminated' })
      .toEqual({
         active: false,
         body: baseline,
         held: false,
      });
   await takeNotice(ARMOR_NAME);
});

test('Remove deletes an existing condition when an ability granting the immunity is added', async () => {
   await setWorldSetting(page, 'immunityHandling', 'remove');

   /** @type {Subject} The Character the test works on. */
   const subject = await createSubject('E2E Immunity Handling Ability Actor');
   /** @type {string} The id of the new world item. */
   const worldAbilityId = await createWorldItem(page, {
      name: ABILITY_NAME,
      type: 'ability',
   });
   await addRulesElement(page, `Item.${worldAbilityId}`, CONTAMINATED_IMMUNITY);
   /** @type {{baseline: number}} Body before the condition. */
   const { baseline } = await applyContaminated(subject);

   await dragItemOntoSheet(page, worldAbilityId, subject.actorId);
   await expect.poll(() => readContaminated(subject), { message: 'adding the ability removed Contaminated' })
      .toEqual({
         active: false,
         body: baseline,
         held: false,
      });
   await takeNotice(ABILITY_NAME);
});

test('Remove reaches the condition an unlinked token holds itself when its world actor gains the immunity',
   async () => {
      await setWorldSetting(page, 'immunityHandling', 'remove');

      /** @type {Subject} The subject, with an unlinked token. */
      const subject = await createSubject('E2E Immunity Handling Token Actor', { unlinked: true });
      /** @type {string} The uuid of the placed token. */
      const tokenUuid = `Scene.${sceneId}.Token.${subject.tokenId}`;
      /** @type {{baseline: number}} Body before the condition. */
      const { baseline } = await applyContaminated(subject);
      expect(await serverHoldsContaminated(tokenUuid), 'the token holds the condition in its delta').toBe(true);
      expect(await serverEffectNames(subject.actorUuid), 'the world actor holds no effect yet').toEqual([]);

      await addWard(subject);
      await expect.poll(() => readContaminated(subject), { message: 'removed from the token actor' }).toEqual({
         active: false,
         body: baseline,
         held: false,
      });
      expect(await serverHoldsContaminated(tokenUuid), 'the token delta no longer holds it').toBe(false);
      expect(await serverEffectNames(subject.actorUuid), 'the world actor holds the ward').toEqual([WARD_NAME]);
      await takeNotice(WARD_NAME);
   });

/**
 * Adds a permanent effect granting the Contaminated immunity on the sheet of a placed unlinked token's synthetic actor.
 * @param {Subject} subject - The Character whose actor the token is of; the token is `tokenId`.
 * @param {string} tokenId - The unlinked token that receives the ward.
 * @returns {Promise<void>} Resolves once the ward holds the immunity element.
 */
async function addTokenWard(subject, tokenId) {
   /** @type {string} The id of the new ward effect. */
   const wardId = await addEffect(page, subject.actorId, WARD_NAME, {
      duration: DURATION_PERMANENT,
      tokenId,
   });
   /** @type {string} The ward's uuid on the token's synthetic actor. */
   const wardUuid = await page.evaluate(
      ({ tokenId, wardId }) => canvas.scene.tokens.get(tokenId).actor.effects.get(wardId).uuid,
      {
         tokenId,
         wardId,
      },
   );
   await addRulesElement(page, wardUuid, CONTAMINATED_IMMUNITY);
}

test('Remove deletes the condition an unlinked token holds when the ward is added on the token sheet', async () => {
   await setWorldSetting(page, 'immunityHandling', 'remove');

   /** @type {Subject} The subject, with an unlinked token. */
   const subject = await createSubject('E2E Immunity Handling Token Sheet Actor', { unlinked: true });
   /** @type {string} The uuid of the placed unlinked token. */
   const tokenUuid = `Scene.${sceneId}.Token.${subject.tokenId}`;
   /** @type {{baseline: number}} Body before the condition. */
   const { baseline } = await applyContaminated(subject);
   expect(await serverHoldsContaminated(tokenUuid), 'the token holds the condition in its delta').toBe(true);
   /** @type {string[]} The names of the effects the world actor holds before the ward. */
   const worldBefore = await serverEffectNames(subject.actorUuid);

   await addTokenWard(subject, subject.tokenId);
   await expect.poll(() => readContaminated(subject), { message: 'removed from the token actor' }).toEqual({
      active: false,
      body: baseline,
      held: false,
   });
   expect(await serverHoldsContaminated(tokenUuid), 'the token delta no longer holds it').toBe(false);
   expect(await serverEffectNames(tokenUuid), 'the ward went to the token delta').toContain(WARD_NAME);
   expect(await serverEffectNames(subject.actorUuid), 'the world actor gained no effect').toEqual(worldBefore);
   await takeNotice(WARD_NAME);
});

test('Remove deletes the condition an unlinked token inherits when the ward is added on the token sheet', async () => {
   await setWorldSetting(page, 'immunityHandling', 'remove');

   // The world actor takes the condition through a linked token; the actor is then unlinked and a second token
   // inherits the condition.
   /** @type {Subject} The subject, with a linked token. */
   const subject = await createSubject('E2E Immunity Handling Inherited Actor');
   /** @type {{baseline: number}} Body before the condition. */
   const { baseline } = await applyContaminated(subject);
   await toggleTokenLink(page, subject.actorId);
   /** @type {Subject} The subject read through the unlinked token. */
   const inheriting = {
      ...subject,
      tokenId: await placeToken(page, subject.actorId),
   };
   /** @type {string} The unlinked token's uuid. */
   const tokenUuid = `Scene.${sceneId}.Token.${inheriting.tokenId}`;
   expect(await readContaminated(inheriting), 'the token inherits the condition').toMatchObject({
      active: true,
      held: true,
   });

   await addTokenWard(subject, inheriting.tokenId);
   await expect.poll(() => readContaminated(inheriting), { message: 'removed from the token actor' }).toEqual({
      active: false,
      body: baseline,
      held: false,
   });
   expect(await serverHoldsContaminated(tokenUuid), 'the token delta holds no live condition').toBe(false);
   expect(
      (await readServerDocument(page, tokenUuid)).delta.effects.some((effect) => effect._tombstone === true),
      'the token delta hides the inherited condition with a tombstone',
   ).toBe(true);
   expect(await serverHoldsContaminated(subject.actorUuid), 'the world actor keeps the condition').toBe(true);
   await takeNotice(WARD_NAME);
});

test('only the client that made the change removes the condition and posts the notice', async ({ browser }) => {
   await setWorldSetting(page, 'immunityHandling', 'remove');

   /** @type {Subject} The Character the test works on. */
   const subject = await createSubject('E2E Immunity Handling Two Clients Actor');
   /** @type {{baseline: number}} Body before the condition. */
   const { baseline } = await applyContaminated(subject);

   /**
    * Counts, on a client, the deletions of Active Effects it initiates from now on.
    * @param {import('@playwright/test').Page} client - The browser page of the watched user.
    * @returns {Promise<void>} Resolves once the counter listens.
    */
   const countDeletions = (client) => client.evaluate(() => {
      globalThis.titanE2eDeletions = 0;
      globalThis.titanE2eDeletionHook = Hooks.on('preDeleteActiveEffect', () => {
         globalThis.titanE2eDeletions += 1;
      });
   });

   /**
    * Reads a client's deletion count and stops the counter. Safe to repeat and before the counter started:
    * `Hooks.off` ignores an id it does not hold (client/helpers/hooks.mjs:81-92, build 364).
    * @param {import('@playwright/test').Page} client - The browser page of the watched user.
    * @returns {Promise<number>} The deletions the client initiated.
    */
   const takeDeletions = (client) => client.evaluate(() => {
      Hooks.off('preDeleteActiveEffect', globalThis.titanE2eDeletionHook);
      return globalThis.titanE2eDeletions;
   });

   await withClients(browser, { second: 'E2E GM 2' }, async ({ second }) => {
      /**
       * Reads whether the second client's copy of the actor holds the Contaminated effect.
       * @returns {Promise<boolean>} True when it does.
       */
      const secondHolds = () => second.evaluate((actorId) => game.actors.get(actorId).effects
         .some((effect) => effect.statuses.has('contaminated')), subject.actorId);
      await expect.poll(secondHolds, { message: 'the second client sees the condition' }).toBe(true);
      try {
         await countDeletions(page);
         await countDeletions(second);

         await addWard(subject);
         await expect.poll(secondHolds, { message: 'the second client sees the condition removed' }).toBe(false);
         await expect.poll(() => readContaminated(subject), { message: 'removed on the first client' }).toEqual({
            active: false,
            body: baseline,
            held: false,
         });
         await takeNotice(WARD_NAME);

         expect(await takeDeletions(page), 'the changing client deleted once').toBe(1);
         expect(await takeDeletions(second), 'the other client deleted nothing').toBe(0);
      }
      finally {
         // The shared page outlives the test: a counter left by a failed assertion would count later tests' deletions.
         await takeDeletions(page);
         await takeDeletions(second);
      }
   });
});

test('Suppress keeps an existing condition suppressed, and switching to Remove deletes it', async () => {
   await setWorldSetting(page, 'immunityHandling', 'suppress');

   /** @type {Subject} The Character the test works on. */
   const subject = await createSubject('E2E Immunity Handling Suppress Actor');
   /** @type {{baseline: number}} Body before the condition. */
   const { baseline } = await applyContaminated(subject);

   await addWard(subject);
   await expect.poll(() => readContaminated(subject), {
      message: 'suppressed: the effect stays, its penalty and status go',
   }).toEqual({
      active: false,
      body: baseline,
      held: true,
   });
   expect(await serverHoldsContaminated(subject.actorUuid), 'the server keeps the suppressed condition').toBe(true);

   await setWorldSetting(page, 'immunityHandling', 'remove');
   await expect.poll(() => readContaminated(subject), { message: 'the switch to Remove deleted it' }).toEqual({
      active: false,
      body: baseline,
      held: false,
   });
   expect(await serverHoldsContaminated(subject.actorUuid), 'the server copy no longer holds it').toBe(false);
   await takeNotice(WARD_NAME);
});

test('a switch to Remove never deletes a mutually immune pair: both stay, suppressed', async () => {
   await setWorldSetting(page, 'immunityHandling', 'suppress');

   /** @type {Subject} The Character the test works on. */
   const subject = await createSubject('E2E Immunity Handling Pair Actor');

   // Both rivals exist before either grants an immunity: an immunity in force would refuse the other's creation.
   /** @type {string} The first rival's uuid. */
   const firstUuid = `${subject.actorUuid}.ActiveEffect.${await addEffect(page, subject.actorId, 'E2E Rival Ward A', {
      duration: DURATION_PERMANENT,
   })}`;
   /** @type {string} The second rival's uuid. */
   const secondUuid = `${subject.actorUuid}.ActiveEffect.${await addEffect(page, subject.actorId, 'E2E Rival Ward B', {
      duration: DURATION_PERMANENT,
   })}`;
   await addRulesElement(page, firstUuid, {
      key: 'E2E Rival Ward B',
      operation: 'immunity',
      selector: 'effect',
   });
   await addRulesElement(page, secondUuid, {
      key: 'E2E Rival Ward A',
      operation: 'immunity',
      selector: 'effect',
   });

   /**
    * Reads whether each rival applies, by name.
    * @returns {Promise<{name: string, active: boolean}[]>} The rivals, in name order.
    */
   const readRivals = () => page.evaluate((actorId) => game.actors.get(actorId).effects
      .filter((effect) => effect.name.startsWith('E2E Rival Ward'))
      .map((effect) => ({
         active: effect.active,
         name: effect.name,
      }))
      .sort((left, right) => left.name.localeCompare(right.name)), subject.actorId);
   await expect.poll(readRivals, { message: 'each is immune to the other: both are suppressed' }).toEqual([
      {
         active: false,
         name: 'E2E Rival Ward A',
      },
      {
         active: false,
         name: 'E2E Rival Ward B',
      },
   ]);

   // A held, suppressed Contaminated is the positive edge of the pass the switch runs over the whole actor: it is
   // deleted by that pass, so the pair surviving it was decided and kept, not skipped.
   const { baseline } = await applyContaminated(subject);
   await addWard(subject);
   await expect.poll(() => readContaminated(subject), { message: 'the ward suppresses Contaminated' }).toEqual({
      active: false,
      body: baseline,
      held: true,
   });
   await setWorldSetting(page, 'immunityHandling', 'remove');
   await expect.poll(() => readContaminated(subject), { message: 'the pass removed Contaminated' }).toEqual({
      active: false,
      body: baseline,
      held: false,
   });
   expect(await readRivals(), 'the pair survived the same pass').toEqual([
      {
         active: false,
         name: 'E2E Rival Ward A',
      },
      {
         active: false,
         name: 'E2E Rival Ward B',
      },
   ]);
   await takeNotice(WARD_NAME);
});

test('the settings window lists the setting with its localized name and choices', async () => {
   /** @type {{label: string, remove: string, suppress: string}} The setting's localized strings. */
   const strings = await page.evaluate(() => ({
      label: game.i18n.localize('SETTINGS.immunityHandling.label'),
      remove: game.i18n.localize('SETTINGS.immunityHandling.remove'),
      suppress: game.i18n.localize('SETTINGS.immunityHandling.suppress'),
   }));
   expect(strings.label, 'the label is localized').not.toBe('SETTINGS.immunityHandling.label');
   expect(strings.remove, 'the Remove choice is localized').not.toBe('SETTINGS.immunityHandling.remove');
   expect(strings.suppress, 'the Suppress choice is localized').not.toBe('SETTINGS.immunityHandling.suppress');

   /** @type {import('@playwright/test').Locator} The settings tab's panel. */
   const panel = await openSidebarTab(page, 'settings');
   await panel.getByRole('button', { name: 'Game Settings' }).click();

   /** @type {import('@playwright/test').Locator} The setting's select (its category tab may be hidden). */
   const select = page.locator('select[name="titan.immunityHandling"]');
   await expect(select).toBeAttached();
   await expect(select.locator('option')).toHaveText([
      strings.remove,
      strings.suppress,
   ]);
   await expect(page.locator('.form-group', { has: select })).toContainText(strings.label);
});
