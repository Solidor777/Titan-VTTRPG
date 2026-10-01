import error from '~/helpers/utility-functions/Error.js';
import log from '~/helpers/utility-functions/Log.js';
import { walkStoredActorSources } from '~/helpers/migration/StoredActorSources.js';
import {
   convertStoredActor,
   needsEffectItemConversion,
   needsInheritedConversionHidden,
} from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';
import {
   getConditionEffectUpdates,
   syncStoredActorConditions,
} from '~/helpers/migration/SyncConditionEffects.js';

/**
 * The outcome of one stored-actor migration pass.
 * @typedef {object} StoredActorMigrationCounts
 * @property {number} updated - Stored actors whose writes changed them, left no work, and are stored.
 * @property {number} skipped - Stored actors with pending work that had nothing left to write to (a pack entry or a
 * token's base actor deleted since the scan) or that held no work once opened (changed since the scan).
 * @property {number} failed - The pass's failures, each reported as it happens: one per stored actor whose migration
 * threw, whose work was left after its writes (a write vetoed or not applied), or whose writes were not stored (an
 * Adventure write core did not store), one per orphaned token with pending work (reported and never written), and one
 * per failure of the walk itself (a world pack it could not read, or a pack lock it could not restore).
 */

/**
 * Whether stored actor data needs the stored-actor migration: a legacy effect Item to convert, an inherited conversion
 * of an Item an unlinked token's own data claims, to hide (needsInheritedConversionHidden), or a condition effect
 * whose rules elements differ from its definition or which still stores a description.
 * @param {{items: object[], effects: object[], inheritedEffects?: object[]}} data - The Item and Active Effect data
 * the actor holds itself, and the Active Effects it inherits and does not override (none when omitted): a walked
 * source, or an opened target's current data.
 * @returns {boolean} Whether the actor needs the migration.
 */
export function storedActorNeedsMigration(data) {
   return needsEffectItemConversion(data.items)
      || needsInheritedConversionHidden(data)
      || getConditionEffectUpdates(data.effects).length > 0;
}

/**
 * Describes an orphaned token the pass reports as a failure instead of writing it (OrphanedToken): it names the token
 * and its scene, and tells the GM to delete the token.
 * @param {OrphanedToken} orphan - The orphaned token's names.
 * @returns {string} The failure's message.
 */
function describeOrphanFailure({ pack, scene, token }) {
   /** @type {string} Where the scene lives: nothing for a world scene, its pack for a packed one. */
   const where = pack ? ` in pack "${pack}"` : '';
   return `Failed to migrate the unlinked token "${token}" on scene "${scene}"${where}: its base actor is gone, so the `
      + 'migration does not write to it. Delete the token.';
}

/**
 * Checks whether any stored actor needs the stored-actor migration, stopping at the first. Reads stored data only. A
 * world pack the walk could not read counts as needing it: its actors went unchecked, and the migration reports the
 * pack as a failure, so a pack that stays unreadable is reported on every migrating load instead of hiding its work.
 * An orphaned token whose own data holds work counts too: the migration reports it as a failure and never writes it,
 * so it is reported on every load until the GM deletes it.
 * @returns {Promise<boolean>} Whether any stored actor needs the migration, or a world pack could not be read.
 */
export async function storedActorsNeedMigration() {
   /** @type {StoredActorWalkFailure[]} The walk's failures; a scan writes nothing, so only unread packs. */
   const failures = [];
   for await (const source of walkStoredActorSources(failures)) {
      if (storedActorNeedsMigration(source)) {
         return true;
      }
   }
   return failures.length > 0;
}

/**
 * Migrates every stored actor that needs it: opens it, converts its legacy effect Items and hides the inherited
 * conversions its own data claims (convertStoredActor), syncs its condition effects (syncStoredActorConditions), then
 * checks its data again, so an actor with work left after its writes (a write vetoed or not applied) fails instead of
 * passing as done. Each actor is isolated: a failure is reported with the actor's name and the rest still migrate. A
 * changed actor counts as updated only once its writes are stored; an Adventure's actors and scene tokens are stored
 * by one write when the walk leaves the Adventure, so every changed actor's stored outcome is read once the walk is
 * over (reading it during the walk would wait on a write that happens only after the walk moves on). An orphaned token
 * with work is never opened: it counts as one failure, reported with its scene and the token's name and the remedy,
 * deleting the token (describeOrphanFailure); one with no work is silent. Each failure of the walk itself (a world pack
 * it could not read, or a pack lock it could not restore) counts as one more failure.
 * @returns {Promise<StoredActorMigrationCounts>} How many stored actors were updated and skipped, and the failures.
 */
export async function migrateStoredActors() {
   /** @type {StoredActorMigrationCounts} The pass's outcome so far. */
   const counts = {
      failed: 0,
      skipped: 0,
      updated: 0,
   };

   /** @type {Array<{name: string, target: StoredActorTarget}>} The changed actors; their outcome is read last. */
   const changed = [];

   /** @type {StoredActorWalkFailure[]} The failures the walk met outside the actors it yielded. */
   const walkFailures = [];
   for await (const source of walkStoredActorSources(walkFailures)) {
      if (!storedActorNeedsMigration(source)) {
         continue;
      }
      if (source.orphan) {
         counts.failed += 1;
         error(describeOrphanFailure(source.orphan));
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
         if (storedActorNeedsMigration({
            effects: target.readEffects(),
            inheritedEffects: target.readInheritedEffects(),
            items: target.readItems(),
         })) {
            throw new Error('Its stored data still needs migration after its writes: a write was vetoed or not '
               + 'applied.');
         }
         if (converted || synced) {
            changed.push({
               name: source.name,
               target,
            });
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
   for (const { name, target } of changed) {
      try {
         await target.stored();
         counts.updated += 1;
      }
      catch (err) {
         counts.failed += 1;
         error(`Failed to migrate the stored actor "${name}".`, err);
      }
   }
   counts.failed += walkFailures.length;
   log(`Stored-actor migration finished: ${counts.updated} updated, ${counts.skipped} skipped; failures: `
      + `${counts.failed}.`);
   return counts;
}
