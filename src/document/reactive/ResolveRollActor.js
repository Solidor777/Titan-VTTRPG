import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';

/**
 * Determines whether a document is a character actor whose data model can roll checks.
 * @param {foundry.abstract.Document} doc - The document to inspect.
 * @returns {boolean} True when the document is an Actor exposing the check-roll methods.
 */
function isRollCapableActor(doc) {
   return doc?.documentName === 'Actor' && typeof doc.system?.requestItemCheck === 'function';
}

/**
 * Resolves the actor that should perform checks for a sheet, bridged for Svelte reactivity.
 *
 * On an actor sheet the actor rolls for itself (ownership is enforced at the button, preserving the
 * character sheet's render-but-disable behavior). On an owned item sheet the item's parent character
 * actor rolls, but only when the current user owns it — `isOwner` already encodes "owns the actor or
 * is a GM" for an embedded item. World/compendium items, non-owners, and non-character documents
 * resolve to undefined, so callers keep their static display with no roll button.
 * @param {import('~/document/reactive/ReactiveDocument.svelte.js').default} document - The sheet's
 * top-level reactive Document bridge.
 * @returns {import('~/document/reactive/ReactiveDocument.svelte.js').default|undefined} The rolling
 * actor's bridge, or undefined when the sheet is not roll-capable for the current user.
 */
export default function resolveRollActor(document) {
   const doc = document?.doc;

   // An actor sheet: the actor rolls for itself.
   if (isRollCapableActor(doc)) {
      return document;
   }

   // An owned item sheet: the parent character actor rolls, gated on the current user owning it.
   if (doc?.documentName === 'Item' && doc.isEmbedded && doc.isOwner && isRollCapableActor(doc.parent)) {
      return new ReactiveDocument(doc.parent);
   }

   return undefined;
}
