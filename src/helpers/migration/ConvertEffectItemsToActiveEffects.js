import log from '~/helpers/utility-functions/Log.js';
import error from '~/helpers/utility-functions/Error.js';

/**
 * Builds Active Effect creation data from a legacy effect Item's raw source data.
 * Maps the legacy item's native and system fields onto the 'effect' Active Effect subtype. The old item used a
 * split active/duration model; under the new universal-disabled model an effect starts ENABLED unless it was an
 * explicitly-deactivated permanent effect. The migrated duration (including its captured initiative) is carried
 * through so the document's _preCreate handler will not override the combat initiative. The status icon is
 * intentionally NOT set here; TitanActiveEffect._preCreate seeds it.
 * Operates on raw source entries (actor._source.items elements) rather than Item instances, because the 'effect'
 * Item subtype is no longer registered: legacy items fail strict construction, land in invalidDocumentIds, and are
 * invisible to actor.items iteration. Raw source bypasses schema casting, so the active value is normalized here
 * (template-era source persisted strings; missing keys take the schema default of true). The created effect is
 * stamped with flags.titan.convertedFromItem so an interrupted conversion never duplicates it on retry.
 * @param {object} itemSource - The legacy effect Item's raw source data (an actor._source.items entry).
 * @returns {object} The Active Effect creation data.
 */
export function buildEffectData(itemSource) {
   /** @type {object} - The legacy item's raw system data, the source of all migrated fields. */
   const system = itemSource.system;

   /** @type {boolean|string|number} - The uncast raw active value; null/missing takes the legacy default of true. */
   const rawActive = system.active ?? true;

   /** @type {boolean} - The normalized active state, mirroring BooleanField casting for template-era strings. */
   const active = typeof rawActive === 'string' ? rawActive === 'true' : Boolean(rawActive);

   /** @type {boolean} - Whether the new effect should start disabled (explicitly-deactivated permanent only). */
   const disabled = system.duration?.type === 'permanent' ? !active : false;

   return {
      name: itemSource.name,
      img: itemSource.img,
      type: 'effect',
      description: system.description ?? '',
      disabled,
      flags: {
         titan: {
            convertedFromItem: itemSource._id,
         },
      },
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
 * Discovery reads the actor's raw _source.items rather than the items collection: the 'effect' subtype is no longer
 * registered, so legacy items are invalid documents excluded from actor.items iteration but fully present in raw
 * source (and deletable by id — the client backend resolves deletions with { invalid: true }). No destructive step
 * occurs before the replacement Active Effects exist: the replacement Active Effects are created first, then the
 * source effect Items are batch-deleted, then any stale cosmetic "mirror" Active Effects (the old base-subtype AEs
 * flagged with flags.titan.type === 'effect') are batch-deleted to avoid duplicates. Creation skips any source
 * whose id already has a surviving converted Active Effect (the convertedFromItem provenance stamp), so a
 * conversion interrupted between creation and deletion finishes cleanly on retry instead of duplicating effects.
 * Deletion is stamp-verified: only sources whose replacement verifiably exists (a pre-existing stamp or a document
 * returned by the create call) are deleted, so a third-party preCreateActiveEffect veto retains its source for the
 * next load instead of losing data.
 * Returns early when there is nothing to do (no effect Items and no stale mirrors); if there are stale mirrors but
 * no effect Items, the mirrors are still removed.
 * @param {TitanActor} actor - The actor whose legacy effect Items should be converted.
 * @returns {Promise<void>}
 */
export async function convertActor(actor) {
   /** @type {object[]} - Raw source entries of the legacy effect Items owned by this actor. */
   const effectItemSources = actor._source.items.filter((item) => item.type === 'effect');

   /** @type {string[]} - The ids of stale mirror Active Effects to delete (base subtype, titan effect flag). */
   const staleEffectIds = actor.effects
      .filter((effect) => effect.type !== 'effect' && effect.flags?.titan?.type === 'effect')
      .map((effect) => effect.id);

   // Nothing to convert and no stale mirrors to clean up: this actor is already in the new state.
   if (effectItemSources.length === 0 && staleEffectIds.length === 0) {
      return;
   }

   /** @type {Set<string>} - Source-item ids that already have a surviving converted Active Effect. */
   const convertedItemIds = new Set(
      actor.effects.map((effect) => effect.flags?.titan?.convertedFromItem).filter(Boolean),
   );

   /** @type {object[]} - Legacy sources still needing a replacement (skips already-converted, retry-safe). */
   const sourcesToCreate = effectItemSources.filter((item) => !convertedItemIds.has(item._id));

   // Create the replacement Active Effects before any destructive step, so no effect data is lost if creation fails.
   /** @type {object[]} - The replacement Active Effects actually created (third-party vetoes excluded). */
   const createdEffects = sourcesToCreate.length > 0
      ? await actor.createEmbeddedDocuments('ActiveEffect', sourcesToCreate.map(buildEffectData))
      : [];

   /** @type {Set<string>} - Source ids with a VERIFIED replacement (pre-existing stamps plus just-created). */
   const verifiedItemIds = new Set([
      ...convertedItemIds,
      ...createdEffects.map((effect) => effect.flags?.titan?.convertedFromItem).filter(Boolean),
   ]);

   /** @type {string[]} - Ids of legacy sources safe to delete (replacement verified; vetoed sources retained). */
   const deletableItemIds = effectItemSources
      .filter((item) => verifiedItemIds.has(item._id))
      .map((item) => item._id);

   // Batch-delete only the source effect Items whose replacements verifiably exist.
   if (deletableItemIds.length > 0) {
      await actor.deleteEmbeddedDocuments('Item', deletableItemIds);
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
 * Converts the legacy effect Items inside a single compendium pack's actors.
 * Index-gated: pulls the pack index with each entry's embedded items projected to their summary index fields
 * (_id/name/img/type/sort/folder — no document construction, no validation, so invalid-typed entries are visible)
 * and returns without touching the pack when no entry carries a legacy effect Item. Otherwise the pack is unlocked
 * if needed, each flagged actor is loaded and converted (per-actor failures are logged and skipped so the rest of
 * the pack still converts), and the pack's original lock state is restored in a finally block even when conversion
 * throws. A restore failure is caught inside the finally and logged as a restore-specific error, so it can never
 * mask an in-flight conversion error or be misread as a conversion failure. Accepted limitation: the index gate
 * flags entries by legacy effect Items only, so a packed actor carrying ONLY stale mirror AEs is never flagged
 * (mirror detection needs flags absent from the summary projection); mirrors normally co-exist with their source
 * items.
 * @param {CompendiumCollection} pack - The compendium pack to convert.
 * @returns {Promise<void>}
 */
export async function convertPack(pack) {
   /** @type {object[]} - The pack index with each entry's items projected to their summary index fields. */
   const index = await pack.getIndex({ fields: ['items'] });

   /** @type {string[]} - The ids of index entries that carry at least one legacy effect Item. */
   const needyIds = index
      .filter((entry) => entry.items?.some((item) => item.type === 'effect'))
      .map((entry) => entry._id);

   // Index gate: leave clean packs completely untouched (no unlock, no document loads).
   if (needyIds.length === 0) {
      return;
   }

   /** @type {boolean} - Whether the pack was locked before conversion (restored in the finally block). */
   const wasLocked = pack.locked;

   try {
      // Unlock the pack for the duration of the conversion.
      if (wasLocked) {
         await pack.configure({ locked: false });
      }

      /** @type {number} - The count of flagged actors successfully converted in this pack. */
      let convertedCount = 0;

      // Load and convert each flagged actor, isolating per-actor failures so the rest of the pack still converts.
      for (const id of needyIds) {
         try {
            /** @type {TitanActor|null} - The packed actor to convert. */
            const actor = await pack.getDocument(id);

            // A missing document (deleted mid-boot) cannot be converted; fail this entry with a clear message.
            if (!actor) {
               throw new Error('The flagged pack entry no longer resolves to a document.');
            }

            await convertActor(actor);
            convertedCount += 1;
         }
         catch (err) {
            error(
               `Failed to convert legacy effect Items for packed actor (${id}) in pack "${pack.metadata.label}".`,
               err,
            );
         }
      }

      log(
         `Converted ${convertedCount} of ${needyIds.length} flagged actor(s) in world pack "${pack.metadata.label}".`,
      );
   }
   finally {
      // Restore the pack's original lock state even when conversion throws, without masking an in-flight error.
      if (wasLocked) {
         try {
            await pack.configure({ locked: true });
         }
         catch (err) {
            error(`Failed to restore the lock on pack "${pack.metadata.label}" — the pack is left unlocked.`, err);
         }
      }
   }
}

/**
 * Converts legacy effect Items inside every world Actor compendium pack.
 * Covers world-package Actor packs only: module and system packs belong to their packages and are not rewritten.
 * Each pack's conversion is isolated, so a failure on one pack (index read, lock toggle, or a wholesale conversion
 * failure) is logged and the remaining packs still process.
 * @returns {Promise<void>}
 */
export async function convertWorldActorPacks() {
   for (const pack of game.packs) {
      // Only world-package Actor packs are eligible for conversion.
      if (pack.metadata.type === 'Actor' && pack.metadata.packageType === 'world') {
         try {
            await convertPack(pack);
         }
         catch (err) {
            error(`Failed to convert legacy effect Items in pack "${pack.metadata.label}".`, err);
         }
      }
   }
}

/**
 * Converts all legacy effect Items in the world into native 'effect' Active Effects.
 * Runs only for the GM. Processes every world actor, the actors of unlinked tokens across all scenes, and the
 * actors inside world Actor compendium packs (index-gated, with locked packs unlocked and restored). Each actor's
 * conversion is isolated, so a failure on one actor is logged and the migration continues with the next.
 * Idempotent: once no legacy effect Items remain, the converter is a no-op.
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

   // Convert the actors inside world Actor compendium packs.
   await convertWorldActorPacks();

   log('Conversion of legacy effect Items to Active Effects complete.');
}
