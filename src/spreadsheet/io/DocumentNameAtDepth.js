/**
 * Whether a document subtype name belongs to the ActiveEffect document class in this world. Checks the
 * system's registered ActiveEffect data models first, then the world's full ActiveEffect type list (which
 * also covers `base` and any module-registered subtype).
 * @param {string} documentType - The subtype name carried by the row's sheet (e.g. "weapon", "condition").
 * @returns {boolean} True when the subtype is an ActiveEffect subtype.
 */
function isActiveEffectSubtype(documentType) {
   // `CONFIG`/`game` are absent outside a live client (unit tests import this module directly), so both
   // are read off globalThis rather than as bare identifiers, which would throw a ReferenceError when
   // undeclared.
   if (globalThis.CONFIG?.ActiveEffect?.dataModels?.[documentType]) {
      return true;
   }
   return (globalThis.game?.documentTypes?.ActiveEffect ?? []).includes(documentType);
}

/**
 * Resolves which document class a spreadsheet row belongs to from its nesting depth, the pack's type, and
 * its own subtype name. Depth 0 is the pack's own type; depth 2 is always an effect on an owned item.
 *
 * Depth 1 is ambiguous for an Actor pack alone — an actor's owned items and an actor's own effects are
 * both depth-1 children — so the subtype name breaks the tie: a subtype registered under ActiveEffect is
 * the actor's own effect, anything else is an owned item. TITAN's Item subtypes (weapon, armor, spell,
 * ability, shield, equipment, commodity) and ActiveEffect subtypes (effect, condition) are disjoint, so
 * the tie-break is exact for this system's packs.
 * @param {'Actor'|'Item'|'ActiveEffect'} packType - The pack's document type.
 * @param {number} depth - The row's nesting depth (0 = top-level pack document).
 * @param {string} documentType - The row's document subtype name.
 * @returns {'Actor'|'Item'|'ActiveEffect'} The document class the row is created/updated through.
 */
export function resolveDocumentNameAtDepth(packType, depth, documentType) {
   if (depth === 0) {
      return packType;
   }
   if (depth === 1 && packType === 'Actor') {
      return isActiveEffectSubtype(documentType) ? 'ActiveEffect' : 'Item';
   }
   return 'ActiveEffect';
}
