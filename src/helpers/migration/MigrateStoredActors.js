import error from '~/helpers/utility-functions/Error.js';
import log from '~/helpers/utility-functions/Log.js';
import { walkStoredActorSources } from '~/helpers/migration/StoredActorSources.js';
import {
   convertStoredActor,
   needsEffectItemConversion,
} from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';
import {
   getConditionEffectUpdates,
   syncStoredActorConditions,
} from '~/helpers/migration/SyncConditionEffects.js';

/**
 * The outcome of one stored-actor migration pass.
 * @typedef {object} StoredActorMigrationCounts
 * @property {number} updated - Stored actors a write changed.
 * @property {number} skipped - Stored actors with pending work that had nothing left to write to (a pack entry or a
 * token's base actor deleted since the scan) or whose writes changed nothing (vetoed by a hook).
 * @property {number} failed - Stored actors whose migration threw; each is reported with its name.
 */

/**
 * Whether a stored actor needs the stored-actor migration: a legacy effect Item to convert, or a condition effect whose
 * rules elements differ from its definition or which still stores a description.
 * @param {StoredActorSource} source - The walked actor, whose stored Items and Active Effects are checked.
 * @returns {boolean} Whether the actor needs the migration.
 */
export function storedActorNeedsMigration(source) {
   return needsEffectItemConversion(source.items)
      || getConditionEffectUpdates(source.effects).length > 0;
}

/**
 * Checks whether any stored actor needs the stored-actor migration, stopping at the first. Reads stored data only.
 * @returns {Promise<boolean>} Whether any stored actor needs the migration.
 */
export async function storedActorsNeedMigration() {
   for await (const source of walkStoredActorSources()) {
      if (storedActorNeedsMigration(source)) {
         return true;
      }
   }
   return false;
}

/**
 * Migrates every stored actor that needs it: opens it, converts its legacy effect Items (convertStoredActor), then
 * syncs its condition effects (syncStoredActorConditions). Each actor is isolated: a failure is reported with the
 * actor's name and the rest still migrate.
 * @returns {Promise<StoredActorMigrationCounts>} How many stored actors were updated, skipped, and failed.
 */
export async function migrateStoredActors() {
   /** @type {StoredActorMigrationCounts} The pass's outcome so far. */
   const counts = {
      failed: 0,
      skipped: 0,
      updated: 0,
   };
   for await (const source of walkStoredActorSources()) {
      if (!storedActorNeedsMigration(source)) {
         continue;
      }
      try {
         /** @type {StoredActorTarget|null} The actor, opened for writing. */
         const target = await source.open();
         if (!target) {
            counts.skipped += 1;
            continue;
         }

         /** @type {boolean} Whether the conversion changed the actor. */
         const converted = await convertStoredActor(target);

         /** @type {boolean} Whether the condition sync changed the actor. */
         const synced = await syncStoredActorConditions(target);
         if (converted || synced) {
            counts.updated += 1;
         }
         else {
            counts.skipped += 1;
         }
      }
      catch (err) {
         counts.failed += 1;
         error(`Failed to migrate the stored actor "${source.name}".`, err);
      }
   }
   log(`Stored actors migrated: ${counts.updated} updated, ${counts.skipped} skipped, ${counts.failed} failed.`);
   return counts;
}
