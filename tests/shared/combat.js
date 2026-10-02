/**
 * Seeds a two-combatant encounter inside the live Foundry world. The effect actor is placed at the
 * LOWER initiative (turn index 1) so a single nextTurn() from the started state begins its turn.
 * Designed to be passed to page.evaluate — references only in-page globals.
 * A test with other clients passes `start: false`, makes each client view the combat (`viewCombat`), then starts it
 * (`startCombatEncounter`).
 * @param {object} opts - The seeding options.
 * @param {string} opts.sceneName - Name for the throwaway scene.
 * @param {object} opts.effectActor - Actor.create payload for the effect-bearing actor.
 * @param {object[]} [opts.effectAbilities] - Item.create payloads (ability rules elements) for the effect actor.
 * @param {object} opts.otherActor - Actor.create payload for the other combatant.
 * @param {number} opts.effectInitiative - Initiative for the effect actor (use the LOWER value).
 * @param {number} opts.otherInitiative - Initiative for the other actor (use the HIGHER value).
 * @param {number} [opts.staminaValue] - If set, the effect actor's stamina is pre-seeded to this value.
 * @param {number} [opts.resolveValue] - If set, the effect actor's resolve is pre-seeded to this value.
 * @param {string} [opts.observerUserName] - If set, this user is granted OWNER on the effect actor.
 * @param {boolean} [opts.start] - Whether to start the encounter at round 1, turn 0 (defaults to true).
 * @returns {Promise<{sceneId: string, combatId: string, effectActorId: string, otherActorId: string,
 *    effectCombatantId: string}>} The created document ids.
 */
export const seedCombatEncounter = async (opts) => {
   const {
      sceneName,
      effectActor,
      effectAbilities,
      otherActor,
      effectInitiative,
      otherInitiative,
      staminaValue,
      resolveValue,
      observerUserName,
      start = true,
   } = opts;

   // Grant the observer OWNER on the effect actor so a non-GM client can read its resources.
   const ownership = {};
   if (observerUserName) {
      const observer = game.users.getName(observerUserName);
      if (observer) {
         ownership[observer.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      }
   }

   // Create the two actors and the effect actor's abilities.
   const effect = await Actor.create({
      ...effectActor,
      ownership: ownership,
   });
   if (effectAbilities && effectAbilities.length > 0) {
      await effect.createEmbeddedDocuments('Item', effectAbilities);
   }
   const other = await Actor.create(otherActor);

   // Pre-seed resources so healing/regain (which only move a below-cap resource) is observable.
   const resource = {};
   if (typeof staminaValue === 'number') {
      resource.stamina = { value: staminaValue };
   }
   if (typeof resolveValue === 'number') {
      resource.resolve = { value: resolveValue };
   }
   if (Object.keys(resource).length > 0) {
      await effect.update({ system: { resource: resource } });
   }

   // Create a scene and place a token for each actor (required for Combatant.actor to resolve). The scene is created
   // inactive: with no active scene, core activates a new scene unless its data names `active`
   // (`Scene._preCreateOperation`), and an activated scene draws its canvas on every client while this helper is
   // already creating tokens (and later updating actors) on it, which raises errors inside core's token drawing.
   const scene = await Scene.create({
      name: sceneName,
      width: 2000,
      height: 2000,
      active: false,
   });
   const effectTokenData = (await effect.getTokenDocument({
      x: 500,
      y: 500,
   })).toObject();
   const otherTokenData = (await other.getTokenDocument({
      x: 1000,
      y: 500,
   })).toObject();
   const [effectToken] = await scene.createEmbeddedDocuments('Token', [effectTokenData]);
   const [otherToken] = await scene.createEmbeddedDocuments('Token', [otherTokenData]);

   // Create combat bound to the scene with explicit (deterministic) initiative.
   const combat = await Combat.create({ scene: scene.id });

   // View the seeded combat in this client's tracker (the posture of a GM actually running the encounter). A tracker
   // keeps viewing the combat it has until it is told otherwise, and the world's own combat is viewed from the first
   // render; core's `CombatTracker#_onRender` then throws a TypeError on every round or turn update of another combat
   // (`"turn" in <undefined>`). Every other client calls `viewCombat` before the encounter starts.
   ui.combat.viewed = combat;
   const [effectCombatant] = await combat.createEmbeddedDocuments('Combatant', [
      {
         tokenId: effectToken.id,
         sceneId: scene.id,
         initiative: effectInitiative,
      },
   ]);
   await combat.createEmbeddedDocuments('Combatant', [
      {
         tokenId: otherToken.id,
         sceneId: scene.id,
         initiative: otherInitiative,
      },
   ]);

   if (start) {
      await combat.startCombat();
   }

   return {
      sceneId: scene.id,
      combatId: combat.id,
      effectActorId: effect.id,
      otherActorId: other.id,
      effectCombatantId: effectCombatant.id,
   };
};

/**
 * Makes this client's combat tracker view a combat. Core's `CombatTracker#_onRender` throws a TypeError on every round
 * or turn update of a combat the tracker is not viewing, so each client that stays connected while the combat advances
 * calls this before the combat starts. Designed to be passed to page.evaluate — references only in-page globals.
 * @param {string} combatId - The id of the combat to view; it must already have replicated to this client.
 * @returns {Promise<void>} Resolves once the combat is the viewed one.
 */
export const viewCombat = async (combatId) => {
   await titanWait(
      () => !!game.combats.get(combatId),
      {
         message: 'the seeded combat replicates to this client',
         timeout: 1000,
      },
   );
   ui.combat.viewed = game.combats.get(combatId);
};

/**
 * Starts a seeded encounter at round 1, turn 0 (highest initiative first = the OTHER actor). Designed to be passed to
 * page.evaluate — references only in-page globals.
 * @param {string} combatId - The id of the combat `seedCombatEncounter` returned.
 * @returns {Promise<void>} Resolves once the combat has started.
 */
export const startCombatEncounter = async (combatId) => {
   await game.combats.get(combatId).startCombat();
};

/**
 * Deletes everything seedCombatEncounter created. Designed to be passed to page.evaluate.
 * @param {object} ids - The ids returned by seedCombatEncounter.
 * @param {string} ids.sceneId - The scene id.
 * @param {string} ids.combatId - The combat id.
 * @param {string} ids.effectActorId - The effect actor id.
 * @param {string} ids.otherActorId - The other actor id.
 * @returns {Promise<void>} Resolves once all created documents are deleted.
 */
export const teardownCombatEncounter = async (ids) => {
   const combat = game.combats.get(ids.combatId);
   if (combat) {
      // Stop viewing the combat before deleting it (seedCombatEncounter set it as viewed).
      if (ui.combat.viewed?.id === ids.combatId) {
         ui.combat.viewed = null;
      }
      await combat.delete();
   }
   const scene = game.scenes.get(ids.sceneId);
   if (scene) {
      await scene.delete();
   }
   for (const actorId of [
      ids.effectActorId,
      ids.otherActorId,
   ]) {
      const actor = game.actors.get(actorId);
      if (actor) {
         await actor.delete();
      }
   }
};
