import log from '~/helpers/utility-functions/Log.js';

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
 * First deletes any stale cosmetic "mirror" Active Effects (the old base-subtype AEs flagged with
 * flags.titan.type === 'effect') to avoid duplicates. Then, for each legacy effect Item, creates the replacement
 * Active Effect BEFORE deleting the source Items so no effect data is lost if creation fails. Deletes are batched.
 * @param {TitanActor} actor - The actor whose legacy effect Items should be converted.
 * @returns {Promise<void>}
 */
export async function convertActor(actor) {
   /** @type {string[]} - The ids of stale mirror Active Effects to delete (base subtype, titan effect flag). */
   const staleEffectIds = actor.effects
      .filter((effect) => effect.type !== 'effect' && effect.flags?.titan?.type === 'effect')
      .map((effect) => effect.id);
   if (staleEffectIds.length > 0) {
      await actor.deleteEmbeddedDocuments('ActiveEffect', staleEffectIds);
   }

   /** @type {TitanItem[]} - The legacy effect Items owned by this actor. */
   const effectItems = actor.items.filter((item) => item.type === 'effect');
   if (effectItems.length === 0) {
      return;
   }

   // Create the replacement Active Effects before deleting the source Items.
   await actor.createEmbeddedDocuments('ActiveEffect', effectItems.map(buildEffectData));
   await actor.deleteEmbeddedDocuments('Item', effectItems.map((item) => item.id));
}

/**
 * Converts all legacy effect Items in the world into native 'effect' Active Effects.
 * Runs only for the GM. Processes every world actor, plus the actors of unlinked tokens across all scenes.
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
      await convertActor(actor);
   }

   // Convert the actors of unlinked tokens across all scenes.
   for (const scene of game.scenes) {
      for (const token of scene.tokens) {
         if (!token.actorLink && token.actor) {
            await convertActor(token.actor);
         }
      }
   }

   log('Conversion of legacy effect Items to Active Effects complete.');
}
