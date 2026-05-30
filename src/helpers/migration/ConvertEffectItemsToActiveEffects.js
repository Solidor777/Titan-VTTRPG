import log from '~/helpers/utility-functions/Log.js';
import error from '~/helpers/utility-functions/Error.js';

/**
 * Builds Active Effect creation data from a legacy effect Item.
 * Maps the legacy item's native and system fields onto the 'effect' Active Effect subtype. The old item used a
 * split active/duration model; under the new universal-disabled model an effect starts ENABLED unless it was an
 * explicitly-deactivated permanent effect. The migrated duration (including its captured initiative) is carried
 * through so the document's _preCreate handler will not override the combat initiative. The status icon and Visual
 * Active Effects description flag are intentionally NOT set here; TitanActiveEffect._preCreate seeds them.
 * @param {TitanItem} item - The legacy effect Item to convert.
 * @returns {object} The Active Effect creation data.
 */
export function buildEffectData(item) {
   /** @type {object} - The legacy item's system data, the source of all migrated fields. */
   const system = item.system;

   /** @type {boolean} - Whether the new effect should start disabled (explicitly-deactivated permanent only). */
   const disabled = system.duration?.type === 'permanent' ? !system.active : false;

   return {
      name: item.name,
      img: item.img,
      type: 'effect',
      description: system.description ?? '',
      disabled,
      system: {
         rulesElement: foundry.utils.deepClone(system.rulesElement),
         duration: foundry.utils.deepClone(system.duration),
         check: foundry.utils.deepClone(system.check),
         customTrait: foundry.utils.deepClone(system.customTrait),
      },
   };
}

/**
 * Converts every legacy effect Item owned by a single actor into a native 'effect' Active Effect.
 * No destructive step occurs before the replacement Active Effects exist: the replacement Active Effects are created
 * first, then the source effect Items are batch-deleted, then any stale cosmetic "mirror" Active Effects (the old
 * base-subtype AEs flagged with flags.titan.type === 'effect') are batch-deleted to avoid duplicates. Returns early
 * when there is nothing to do (no effect Items and no stale mirrors); if there are stale mirrors but no effect Items,
 * the mirrors are still removed.
 * @param {TitanActor} actor - The actor whose legacy effect Items should be converted.
 * @returns {Promise<void>}
 */
export async function convertActor(actor) {
   /** @type {TitanItem[]} - The legacy effect Items owned by this actor. */
   const effectItems = actor.items.filter((item) => item.type === 'effect');

   /** @type {string[]} - The ids of stale mirror Active Effects to delete (base subtype, titan effect flag). */
   const staleEffectIds = actor.effects
      .filter((effect) => effect.type !== 'effect' && effect.flags?.titan?.type === 'effect')
      .map((effect) => effect.id);

   // Nothing to convert and no stale mirrors to clean up: this actor is already in the new state.
   if (effectItems.length === 0 && staleEffectIds.length === 0) {
      return;
   }

   // Create the replacement Active Effects before any destructive step, so no effect data is lost if creation fails.
   if (effectItems.length > 0) {
      await actor.createEmbeddedDocuments('ActiveEffect', effectItems.map(buildEffectData));

      // Batch-delete the source effect Items now that their replacements exist.
      await actor.deleteEmbeddedDocuments('Item', effectItems.map((item) => item.id));
   }

   // Batch-delete the stale mirror Active Effects last.
   if (staleEffectIds.length > 0) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', staleEffectIds);
   }
}

/**
 * Converts a single actor's legacy effect Items, isolating any failure so the world-wide migration can continue.
 * Wraps convertActor in a try/catch: a failure on one actor is logged (with the actor's name and id) and swallowed
 * so the remaining actors are still processed, rather than aborting the migration and leaving a partial world.
 * @param {TitanActor} actor - The actor to convert.
 * @returns {Promise<void>}
 */
async function convertActorIsolated(actor) {
   try {
      await convertActor(actor);
   }
   catch (err) {
      error(`Failed to convert legacy effect Items for actor "${actor.name}" (${actor.id}).`, err);
   }
}

/**
 * Converts all legacy effect Items in the world into native 'effect' Active Effects.
 * Runs only for the GM. Processes every world actor, plus the actors of unlinked tokens across all scenes. Each
 * actor's conversion is isolated, so a failure on one actor is logged and the migration continues with the next.
 * Idempotent: once no legacy effect Items remain, the converter is a no-op. Compendium-packed actors are NOT
 * converted by this routine.
 * @returns {Promise<void>}
 */
export default async function convertEffectItemsToActiveEffects() {
   if (!game.user.isGM) {
      return;
   }

   log('Starting conversion of legacy effect Items to Active Effects.');

   // Convert all world actors.
   for (const actor of game.actors) {
      await convertActorIsolated(actor);
   }

   // Convert the actors of unlinked tokens across all scenes.
   for (const scene of game.scenes) {
      for (const token of scene.tokens) {
         if (!token.actorLink && token.actor) {
            await convertActorIsolated(token.actor);
         }
      }
   }

   log('Conversion of legacy effect Items to Active Effects complete.');
}
