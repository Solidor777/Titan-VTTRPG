/**
 * Seeds a two-combatant encounter inside the live Foundry world. The effect actor is placed at the
 * LOWER initiative (turn index 1) so a single nextTurn() from the started state begins its turn.
 * Designed to be passed to page.evaluate — references only in-page globals.
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
 * @returns {Promise<{sceneId: string, combatId: string, effectActorId: string, otherActorId: string, effectCombatantId: string}>}
 *   The created document ids.
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
   const effect = await Actor.create({ ...effectActor, ownership: ownership });
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

   // Create a scene and place a token for each actor (required for Combatant.actor to resolve).
   const scene = await Scene.create({ name: sceneName, width: 2000, height: 2000 });
   const effectTokenData = (await effect.getTokenDocument({ x: 500, y: 500 })).toObject();
   const otherTokenData = (await other.getTokenDocument({ x: 1000, y: 500 })).toObject();
   const [effectToken] = await scene.createEmbeddedDocuments('Token', [effectTokenData]);
   const [otherToken] = await scene.createEmbeddedDocuments('Token', [otherTokenData]);

   // Create combat bound to the scene with explicit (deterministic) initiative.
   const combat = await Combat.create({ scene: scene.id });
   const [effectCombatant] = await combat.createEmbeddedDocuments('Combatant', [
      { tokenId: effectToken.id, sceneId: scene.id, initiative: effectInitiative },
   ]);
   await combat.createEmbeddedDocuments('Combatant', [
      { tokenId: otherToken.id, sceneId: scene.id, initiative: otherInitiative },
   ]);

   // Start the encounter at round 1, turn 0 (highest initiative first = the OTHER actor).
   if (typeof combat.startCombat === 'function') {
      await combat.startCombat();
   }
   else {
      await combat.update({ active: true, round: 1, turn: 0 });
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
      await combat.delete();
   }
   const scene = game.scenes.get(ids.sceneId);
   if (scene) {
      await scene.delete();
   }
   for (const actorId of [ids.effectActorId, ids.otherActorId]) {
      const actor = game.actors.get(actorId);
      if (actor) {
         await actor.delete();
      }
   }
};
