import error from '~/helpers/utility-functions/Error.js';
import log from '~/helpers/utility-functions/Log.js';
import { findConditionDefinition } from '~/system/Conditions.js';

/**
 * An update bringing one stored condition Active Effect in line with its system definition. It carries only the
 * fields that differ: `_id` names the effect, `system.rulesElement` holds the definition's rules elements when the
 * stored ones differ, and `flags.titan.description` holds `_del`, deleting a stored description that nothing reads.
 * @typedef {object} ConditionEffectUpdate
 * @property {string} _id - The Active Effect's id; the other keys are dotted update paths, present only when needed.
 */

/**
 * One actor's pending condition sync.
 * @typedef {object} ConditionEffectSync
 * @property {string} name - The world actor's or the token's name, for reports.
 * @property {() => TitanActor|null} getActor - Resolves the actor to update. For an unlinked token it reads
 * `token.actor`, which materializes a lazy synthetic actor, so it runs only for a token with a stale effect.
 * @property {ConditionEffectUpdate[]} updates - The updates for the actor's stale condition effects.
 */

/**
 * Serializes a value to JSON with every object's keys sorted, so structurally equal values serialize identically
 * whatever order their keys were written in. Stored rules elements keep the key order of whatever wrote them, so a
 * plain JSON comparison would report an up-to-date condition as stale on every load.
 * @param {*} value - The value to serialize.
 * @returns {string} The JSON text, identical for values that differ only in key order.
 */
export function toCanonicalJson(value) {
   return JSON.stringify(value, (key, entry) => {
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
         return Object.fromEntries(Object.keys(entry).sort().map((entryKey) => [
            entryKey,
            entry[entryKey],
         ]));
      }
      return entry;
   });
}

/**
 * Builds the update that brings a stored condition Active Effect in line with its system definition. A condition's
 * rules elements are copied onto its effect at creation, so a changed definition reaches existing effects only through
 * this update. A stored `flags.titan.description` is deleted: condition descriptions are read from the definitions
 * (getConditionDescription, getConditionDescriptionKey), so the flag is a dead copy of one client's localized text.
 * The deletion uses Foundry v14's `_del` (the global ForcedDeletion operator instance); the `-=` key form is
 * deprecated and logs a compatibility warning on every use. Once applied, the update leaves nothing to update, so the
 * sync stays idempotent.
 * @param {object} source - The Active Effect's stored data (an entry of `actor._source.effects` or of an unlinked
 * token's `_source.delta.effects`).
 * @returns {ConditionEffectUpdate|null} The update, or null when the effect applies no single system condition or its
 * rules elements are current and it stores no description.
 */
export function getConditionEffectUpdate(source) {
   if (source.type !== 'condition') {
      return null;
   }

   /** @type {object|undefined} The system condition the effect applies (a fresh copy the update may own). */
   const definition = findConditionDefinition(source.statuses ?? []);
   if (!definition) {
      return null;
   }

   /** @type {object[]} The definition's rules elements. */
   const rulesElement = definition.system?.rulesElement ?? [];

   /** @type {boolean} Whether the stored rules elements differ from the definition's. */
   const rulesElementStale = toCanonicalJson(source.system?.rulesElement ?? []) !== toCanonicalJson(rulesElement);

   /** @type {boolean} Whether the effect still stores a description. */
   const storesDescription = source.flags?.titan?.description !== undefined;
   if (!rulesElementStale && !storesDescription) {
      return null;
   }

   /** @type {ConditionEffectUpdate} The update, carrying only what differs. */
   const update = {
      _id: source._id,
   };
   if (rulesElementStale) {
      update['system.rulesElement'] = rulesElement;
   }
   if (storesDescription) {
      update['flags.titan.description'] = _del;
   }
   return update;
}

/**
 * Builds the updates for the stale condition effects among stored Active Effect sources. An ActorDelta tombstone (a
 * deleted inherited effect, `{ _id, _tombstone: true }`) is skipped.
 * @param {object[]} sources - The stored Active Effect data.
 * @returns {ConditionEffectUpdate[]} One update per stale condition effect.
 */
export function getConditionEffectUpdates(sources) {
   /** @type {ConditionEffectUpdate[]} The stale effects' updates, in source order. */
   const updates = [];
   for (const source of sources) {
      if (source._tombstone) {
         continue;
      }

      /** @type {ConditionEffectUpdate|null} The effect's update, if it is stale. */
      const update = getConditionEffectUpdate(source);
      if (update) {
         updates.push(update);
      }
   }
   return updates;
}

/**
 * Yields the pending condition sync of every actor with a stale stored condition effect: each world actor (from its
 * stored effects), then each unlinked token on every scene (from the effects its delta manages). Effects a token
 * inherits from its base actor are the base actor's and are synced there, so a failed base-actor update never writes a
 * token copy of an inherited effect. A linked token's actor is its world actor, and a token whose base actor is gone
 * has no actor to update. Only stored data is scanned: `token.actor` is read through `getActor`, for a stale token
 * only.
 * @returns {Generator<ConditionEffectSync>} A generator over the stale actors' syncs.
 * @yields {ConditionEffectSync} The next stale actor's sync.
 */
export function* getConditionEffectSyncs() {
   for (const actor of game.actors) {
      /** @type {ConditionEffectUpdate[]} The world actor's updates. */
      const updates = getConditionEffectUpdates(actor._source.effects ?? []);
      if (updates.length > 0) {
         yield {
            getActor: () => actor,
            name: actor.name,
            updates,
         };
      }
   }
   for (const scene of game.scenes) {
      for (const token of scene.tokens) {
         if (token.actorLink || !token.baseActor) {
            continue;
         }

         /** @type {ConditionEffectUpdate[]} The updates for the effects the token's delta manages. */
         const updates = getConditionEffectUpdates(token._source.delta?.effects ?? []);
         if (updates.length > 0) {
            yield {
               getActor: () => token.actor,
               name: token.name,
               updates,
            };
         }
      }
   }
}

/**
 * Checks whether any stored condition Active Effect in the world differs from its system definition or still stores a
 * description.
 * @returns {boolean} Whether any condition effect needs the sync.
 */
export function conditionEffectsNeedSync() {
   return !getConditionEffectSyncs().next().done;
}

/**
 * Syncs every stale condition Active Effect (world actors and the effects unlinked tokens hold themselves) to its
 * system definition: rewrites differing rules elements and deletes a stored description, in one update per actor.
 * Idempotent: a synced effect produces no update. GM-only. An actor whose update fails is reported and the rest still
 * sync.
 * @returns {Promise<number>} The number of actors updated.
 */
export default async function syncConditionEffects() {
   if (!game.user.isGM) {
      return 0;
   }

   /** @type {number} The actors updated. */
   let updated = 0;
   for (const sync of [...getConditionEffectSyncs()]) {
      try {
         await sync.getActor().updateEmbeddedDocuments('ActiveEffect', sync.updates);
         updated++;
      }
      catch (err) {
         error(`Failed to sync the conditions of "${sync.name}".`, err);
      }
   }

   if (updated > 0) {
      log(`Synced the conditions of ${updated} actors.`);
   }
   return updated;
}
