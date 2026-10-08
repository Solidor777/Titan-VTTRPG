import { CONDITION_TYPE } from '~/system/EffectTypes.js';
import { findConditionDefinition } from '~/system/Conditions.js';

/**
 * An update bringing one stored condition Active Effect in line with its system definition. It carries only the
 * fields that differ: `_id` names the effect, `system.rulesElement` holds the definition's rules elements when the
 * stored ones differ, and `flags.titan.description` holds `_del`, deleting a stored description that nothing reads.
 * @typedef {object} ConditionEffectUpdate
 * @property {string} _id - The Active Effect's id; the other keys are dotted update paths, present only when needed.
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
 * @param {object} source - The Active Effect's stored data, as a stored actor holds it.
 * @returns {ConditionEffectUpdate|null} The update, or null when the effect applies no single system condition or its
 * rules elements are current and it stores no description.
 */
export function getConditionEffectUpdate(source) {
   if (source.type !== CONDITION_TYPE) {
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
 * Syncs one stored actor's stale condition effects to their definitions in one update: differing rules elements are
 * rewritten and a stored description is deleted. Only the effects the actor holds itself are read, so an unlinked
 * token never gains a copy of an effect it inherits. Idempotent: a synced effect produces no update.
 * @param {StoredActorTarget} target - The stored actor, opened for writing.
 * @returns {Promise<boolean>} Whether the update changed any effect.
 */
export async function syncStoredActorConditions(target) {
   /** @type {ConditionEffectUpdate[]} The updates for the actor's stale condition effects. */
   const updates = getConditionEffectUpdates(target.readEffects());
   if (updates.length === 0) {
      return false;
   }
   return (await target.updateEffects(updates)).length > 0;
}
