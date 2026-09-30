/**
 * Builds Active Effect creation data from a legacy effect Item's raw source data.
 * Maps the legacy item's native and system fields onto the 'effect' Active Effect subtype. The old item used a
 * split active/duration model; under the new universal-disabled model an effect starts ENABLED unless it was an
 * explicitly-deactivated permanent effect. The migrated duration (including its captured initiative) is carried
 * through so the document's _preCreate handler will not override the combat initiative. The status icon is
 * intentionally NOT set here; TitanActiveEffect._preCreate seeds it.
 * Operates on stored Item data rather than Item instances, because the 'effect' Item subtype is no longer registered:
 * legacy items fail strict construction, land in invalidDocumentIds, and are invisible to actor.items iteration.
 * Stored data bypasses schema casting, so the active value is normalized here (template-era source persisted
 * strings; missing keys take the schema default of true). The created effect is stamped with
 * flags.titan.convertedFromItem so an interrupted conversion never duplicates it on retry.
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
 * Whether stored Item data is a legacy effect Item: the `effect` Item subtype, which TITAN no longer registers, so such
 * an Item is an invalid document present only in stored data.
 * @param {object} item - The stored Item data.
 * @returns {boolean} Whether the Item is a legacy effect Item.
 */
export function isLegacyEffectItem(item) {
   return item.type === 'effect';
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
 * Converts one stored actor's legacy effect Items into native 'effect' Active Effects. Discovery reads the actor's
 * stored Item data: the 'effect' subtype is no longer registered, so legacy Items are invalid documents excluded from
 * collection iteration but present in stored data (and deletable by id). No destructive step happens before the
 * replacements exist: the replacement Active Effects are created first, then the source Items are deleted. Base-type
 * Active Effects (the cosmetic copies older versions kept beside legacy Items) are not handled: TITAN registers only
 * the `effect` and `condition` Active Effect types, so the client cannot construct or delete one. Creation skips a
 * source whose id
 * already has a converted Active Effect the actor has (its `flags.titan.convertedFromItem` stamp, an unlinked token's
 * inherited effects included), so a conversion interrupted between creation and deletion finishes on a later load
 * instead of duplicating effects. Deletion is stamp-verified: only sources whose replacement verifiably exists (a stamp
 * the actor already had, or one on an effect the create returned) are deleted, so a hook's veto of a creation keeps
 * its source for the next load.
 * @param {StoredActorTarget} target - The stored actor, opened for writing.
 * @returns {Promise<boolean>} Whether any write changed the actor.
 */
export async function convertStoredActor(target) {
   /** @type {object[]} The stored data of the legacy effect Items the actor holds itself. */
   const effectItemSources = target.readItems().filter(isLegacyEffectItem);
   if (effectItemSources.length === 0) {
      return false;
   }

   /** @type {Set<string>} The source-Item ids that already have a converted Active Effect on the actor. */
   const convertedItemIds = new Set(target.readHeldEffects()
      .map((effect) => effect.flags?.titan?.convertedFromItem)
      .filter(Boolean));

   /** @type {object[]} The legacy sources still needing a replacement. */
   const sourcesToCreate = effectItemSources.filter((item) => !convertedItemIds.has(item._id));

   // Create the replacements before any destructive step, so no effect data is lost if creation fails.
   /** @type {object[]} The data of the replacements actually created (vetoed creations are absent). */
   const created = sourcesToCreate.length > 0
      ? await target.createEffects(sourcesToCreate.map(buildEffectData))
      : [];

   /** @type {Set<string>} The source-Item ids with a verified replacement. */
   const verifiedItemIds = new Set([
      ...convertedItemIds,
      ...created.map((effect) => effect.flags?.titan?.convertedFromItem).filter(Boolean),
   ]);

   /** @type {string[]} The ids of the legacy sources safe to delete. */
   const deletableItemIds = effectItemSources
      .filter((item) => verifiedItemIds.has(item._id))
      .map((item) => item._id);

   /** @type {string[]} The ids of the legacy sources deleted. */
   const deletedItemIds = deletableItemIds.length > 0 ? await target.deleteItems(deletableItemIds) : [];
   return created.length + deletedItemIds.length > 0;
}
