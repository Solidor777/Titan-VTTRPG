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
 * @typedef {object} RollActorReference
 * @property {import('~/document/reactive/ReactiveDocument.svelte.js').default|undefined} current - The bridge of the
 * actor that rolls checks, or undefined when the sheet is not roll-capable for the current user. Reading it inside a
 * component or `$derived` subscribes the reader to the sheet document's ownership, so it follows ownership changes.
 */

/**
 * Resolves the actor that should perform checks for a sheet, bridged for Svelte reactivity.
 *
 * On an actor sheet the actor rolls for itself (ownership is enforced at the button, preserving the
 * character sheet's render-but-disable behavior). On an embedded item sheet the item's parent character
 * actor rolls, but only while the current user owns the item — `isOwner` encodes "owns the actor or
 * is a GM" for an embedded item and changes when the parent's ownership changes. World/compendium items and
 * non-character documents never resolve an actor, so callers keep their static display with no roll button.
 * @param {import('~/document/reactive/ReactiveDocument.svelte.js').default} document - The sheet's
 * top-level reactive Document bridge.
 * @returns {RollActorReference} The reference whose `current` is the rolling actor's bridge, or undefined.
 */
export default function resolveRollActor(document) {
   const doc = document?.doc;

   // An actor sheet: the actor rolls for itself.
   if (isRollCapableActor(doc)) {
      return { current: document };
   }

   // An embedded item sheet: the parent character actor rolls, gated on the current user owning the item.
   if (doc?.documentName === 'Item' && doc.isEmbedded && isRollCapableActor(doc.parent)) {
      /** @type {ReactiveDocument} The bridge of the item's parent actor. */
      const parentBridge = new ReactiveDocument(doc.parent);
      return {
         get current() {
            return document.data.isOwner ? parentBridge : undefined;
         },
      };
   }

   return { current: undefined };
}
