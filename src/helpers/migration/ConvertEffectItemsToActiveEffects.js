import { EFFECT_TYPE } from '~/system/EffectTypes.js';

/**
 * Builds Active Effect creation data from a legacy effect Item's raw source data.
 * Maps the legacy item's native and system fields onto the 'effect' Active Effect subtype. The old item used a
 * split active/duration model; under the universal-disabled model an effect starts enabled unless it was an
 * explicitly deactivated permanent effect. The migrated duration (including its captured initiative) is carried
 * through so the document's _preCreate handler will not override the combat initiative. The status icon and a timed
 * effect's disabled state are set at creation (getEffectCreationChanges: `TitanActiveEffect._preCreate` for a created
 * document, `TitanActiveEffect.buildCreationSource` for an effect written as data), so an expired timed effect is
 * stored disabled. The data sets `transfer: false`, the value core's `_preCreate` stores for an effect whose parent is
 * an Actor (Foundry v14 `common/documents/active-effect.mjs` `_preCreate`), so the data matches a created document.
 * Operates on stored Item data rather than Item instances, because the 'effect' Item subtype is no longer registered:
 * legacy items fail strict construction, land in invalidDocumentIds, and are invisible to actor.items iteration.
 * Stored data bypasses schema casting, so the active value is normalized here (template-era source persisted
 * strings; missing keys take the schema default of true). The effect takes the Item's `_id` (created with core's
 * `keepId`): core relates an unlinked token's delta to its base actor only by `_id` within each collection (Foundry
 * v14 `common/documents/actor-delta.mjs` `#mergeEmbeddedCollection`), so a token's conversion of an Item that
 * overrides its base actor's Item overrides the base actor's conversion, as the Items did. It is also stamped with
 * flags.titan.convertedFromItem, the mark of a conversion: effects converted before they took the Item's id carry
 * only the stamp, and an effect with the Item's id but no stamp is not a conversion.
 * @param {object} itemSource - The legacy effect Item's stored data.
 * @returns {object} The Active Effect creation data.
 */
export function buildEffectData(itemSource) {
   /** @type {object} - The legacy item's raw system data, the source of all migrated fields. */
   const system = itemSource.system;

   /** @type {boolean|string|number} - The uncast raw active value; null/missing takes the legacy default of true. */
   const rawActive = system.active ?? true;

   /** @type {boolean} - The normalized active state, mirroring BooleanField casting for template-era strings. */
   const active = typeof rawActive === 'string' ? rawActive === 'true' : Boolean(rawActive);

   /**
    * Whether a permanent effect starts deactivated; creation sets a timed effect's state. The stored `permanent` is the
    * legacy Item's frozen duration form, so it stays a literal.
    * @type {boolean}
    */
   const disabled = system.duration?.type === 'permanent' ? !active : false;

   return {
      _id: itemSource._id,
      name: itemSource.name,
      img: itemSource.img,
      type: EFFECT_TYPE,
      description: system.description ?? '',
      disabled,
      transfer: false,
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
 * Whether stored Item data is a legacy effect Item: the `effect` Item subtype, which TITAN no longer registers, so such
 * an Item is an invalid document present only in stored data.
 * @param {object} item - The stored Item data.
 * @returns {boolean} Whether the Item is a legacy effect Item.
 */
export function isLegacyEffectItem(item) {
   return item.type === 'effect';
}

/**
 * Reads the legacy effect Item a converted Active Effect replaced: its `flags.titan.convertedFromItem` stamp.
 * @param {object} effect - Stored Active Effect data.
 * @returns {string|undefined} The source Item's id; undefined for an effect no conversion created.
 */
function getConvertedItemId(effect) {
   return effect.flags?.titan?.convertedFromItem;
}

/**
 * The ids of the Items an actor's own data claims: every Item entry it holds itself (for an unlinked token, its delta's
 * Items, which override the base actor's Items with their ids, and its tombstones, which remove them) and the source
 * Item of every conversion it holds itself. A base actor's conversion of a claimed Item must not show on the token:
 * core relates a delta to its base by `_id` within each collection (Foundry v14 `common/documents/actor-delta.mjs`
 * `#mergeEmbeddedCollection`), so a delta's Item hides the base actor's Item with its id but not that Item's
 * conversion, which lives in the effects.
 * @param {object[]} items - The Item data the actor holds itself, tombstones included.
 * @param {object[]} effects - The Active Effect data the actor holds itself, tombstones included.
 * @returns {Set<string>} Each Item id an Item entry or an own conversion of the actor names.
 */
function getClaimedItemIds(items, effects) {
   return new Set([
      ...items.map((item) => item._id),
      ...effects.filter((effect) => !effect._tombstone).map(getConvertedItemId).filter(Boolean),
   ]);
}

/**
 * Whether a stored actor needs the legacy effect-Item conversion: it holds a legacy effect Item itself.
 * @param {object[]} items - The Item data the actor holds itself.
 * @returns {boolean} Whether the actor needs the conversion.
 */
export function needsEffectItemConversion(items) {
   return items.some(isLegacyEffectItem);
}

/**
 * Whether an unlinked token shows a conversion it inherits from its base actor of an Item its own data claims
 * (getClaimedItemIds): the token overrode or removed that Item, or holds its own conversion of it, so the inherited
 * conversion must be hidden. An actor that inherits nothing never does.
 * @param {object} data - The actor's stored data.
 * @param {object[]} data.items - The Item data the actor holds itself, tombstones included.
 * @param {object[]} data.effects - The Active Effect data the actor holds itself, tombstones included.
 * @param {object[]} [data.inheritedEffects] - The Active Effect data the actor inherits and does not override; none
 * when omitted.
 * @returns {boolean} Whether an inherited conversion must be hidden.
 */
export function needsInheritedConversionHidden({ effects, inheritedEffects = [], items }) {
   /** @type {Set<string>} The Item ids the actor's own data claims. */
   const claimed = getClaimedItemIds(items, effects);
   return inheritedEffects.some((effect) => claimed.has(getConvertedItemId(effect)));
}

/**
 * Converts one stored actor's legacy effect Items into native 'effect' Active Effects, each taking its Item's `_id`
 * (buildEffectData). Discovery reads the actor's stored Item data: the 'effect' subtype is no longer registered, so
 * legacy Items are invalid documents excluded from collection iteration but present in stored data (and deletable by
 * id). Base-type Active Effects (the cosmetic copies older versions kept beside legacy Items) are not handled: the
 * migration has no code for them.
 * Steps, each read back from stored data:
 * 1. Hide every inherited conversion of an Item the actor's own data claims (getClaimedItemIds): an unlinked token's
 * delta that overrides or removed a legacy Item, or holds its own conversion of it, must not show its base actor's
 * conversion, so it gets an ActorDelta tombstone, as core deletes an inherited effect from a synthetic actor. This
 * runs first, so a conversion the token creates next takes a slot no inherited effect holds: core's create path over a
 * tombstone (`common/abstract/embedded-collection-delta.mjs` `_set`) rather than a create over an inherited id.
 * 2. Create the conversion of each legacy Item the actor holds itself and has no conversion of yet (an effect of its
 * own stamped with the Item's id): a token's own Item converts into the token's own effect even when its base actor's
 * conversion exists, so the token keeps its own state, as its Item did. Two cases are not converted. An Item whose
 * inherited conversion the actor still shows after the hide (a hook vetoed it), under the Item's id or under an older
 * version's random id, keeps its Item: a creation beside it would show the token two conversions, and its work is
 * left for the pass to count. An Item whose id an effect that is not its conversion takes keeps its Item too, and is
 * reported by the error this function throws once its other writes are done.
 * 3. Delete the legacy Items whose conversion verifiably exists (a conversion the actor already held, or one the
 * create returned), so a vetoed creation keeps its Item for the next load and an interrupted conversion finishes
 * without duplicating effects.
 * @param {StoredActorTarget} target - The stored actor, opened for writing.
 * @returns {Promise<boolean>} Whether any write changed the actor.
 * @throws {Error} When an effect that is not a legacy Item's conversion holds the Item's id; that Item is kept.
 */
export async function convertStoredActor(target) {
   /** @type {object[]} The Item data the actor holds itself, tombstones included. */
   const items = target.readItems();

   /** @type {object[]} The stored data of the legacy effect Items the actor holds itself. */
   const effectItemSources = items.filter(isLegacyEffectItem);

   /** @type {Set<string>} The Item ids the actor's own data claims. */
   const claimed = getClaimedItemIds(items, target.readEffects());

   /** @type {string[]} The ids of the inherited conversions of claimed Items. */
   const hideIds = target.readInheritedEffects()
      .filter((effect) => claimed.has(getConvertedItemId(effect)))
      .map((effect) => effect._id);
   if (effectItemSources.length === 0 && hideIds.length === 0) {
      return false;
   }

   /** @type {string[]} The ids of the inherited conversions now hidden (a vetoed deletion is absent). */
   const hiddenIds = hideIds.length > 0 ? await target.deleteEffects(hideIds) : [];

   /** @type {object[]} The Active Effect data the actor holds itself, tombstones excluded, after the hide. */
   const ownEffects = target.readEffects().filter((effect) => !effect._tombstone);

   /** @type {object[]} The Active Effect data the actor inherits after the hide (a vetoed hide leaves it here). */
   const inheritedEffects = target.readInheritedEffects();

   /** @type {Set<string>} The source-Item ids with a conversion the actor holds itself. */
   const convertedItemIds = new Set(ownEffects.map(getConvertedItemId).filter(Boolean));

   /** @type {Set<string>} The source-Item ids of the inherited conversions the actor still shows, under any id. */
   const inheritedConvertedItemIds = new Set(inheritedEffects.map(getConvertedItemId).filter(Boolean));

   /** @type {Map<string, object>} Every Active Effect the actor shows, its own and its inherited, by id. */
   const shownEffects = new Map([
      ...inheritedEffects,
      ...ownEffects,
   ].map((effect) => [
      effect._id,
      effect,
   ]));

   /** @type {object[]} The legacy sources without a conversion of the actor's own. */
   const unconverted = effectItemSources.filter((item) => !convertedItemIds.has(item._id));

   /** @type {object[]} The unconverted sources whose id an effect that is not their conversion takes. */
   const collided = unconverted.filter((item) => shownEffects.has(item._id)
      && getConvertedItemId(shownEffects.get(item._id)) !== item._id);

   /** @type {object[]} The sources to convert: no shown effect takes their id or is their inherited conversion. */
   const sourcesToCreate = unconverted.filter((item) => !shownEffects.has(item._id)
      && !inheritedConvertedItemIds.has(item._id));

   /** @type {object[]} The data of the conversions created (vetoed creations are absent). */
   const created = sourcesToCreate.length > 0
      ? await target.createEffects(sourcesToCreate.map(buildEffectData))
      : [];

   /** @type {Set<string>} The source-Item ids with a verified conversion of the actor's own. */
   const verifiedItemIds = new Set([
      ...convertedItemIds,
      ...created.map(getConvertedItemId).filter(Boolean),
   ]);

   /** @type {string[]} The ids of the legacy sources safe to delete. */
   const deletableItemIds = effectItemSources
      .filter((item) => verifiedItemIds.has(item._id))
      .map((item) => item._id);

   /** @type {string[]} The ids of the legacy sources deleted. */
   const deletedItemIds = deletableItemIds.length > 0 ? await target.deleteItems(deletableItemIds) : [];
   if (collided.length > 0) {
      throw new Error(`Legacy effect Items ${collided.map((item) => `"${item.name}" [${item._id}]`).join(', ')} were `
         + 'kept: an Active Effect that is not their conversion already takes their id.');
   }
   return hiddenIds.length + created.length + deletedItemIds.length > 0;
}
