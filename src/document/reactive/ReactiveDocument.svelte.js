import { createSubscriber } from 'svelte/reactivity';

/**
 * @class ReactiveDocument
 * Bridges a Foundry Document into Svelte 5 reactivity. `.data` returns the LIVE document; when read
 * inside a component or `$derived` it subscribes to the document's update hooks (including embedded
 * item/effect CRUD) and when an ancestor's ownership changes (an embedded document's `isOwner` follows its parent), so
 * reactive readers re-run whenever the document changes. Because `.data` is the
 * live document, reactive reads (`.data.system.x`), writes (`.data.update(...)`), collections
 * (`.data.items`), and methods (`.data.system.someMethod()`) all work through the same accessor.
 */
export default class ReactiveDocument {
   /** @type {() => void} Subscriber registration returned by createSubscriber. */
   #subscribe;

   /**
    * Wraps the Document and registers hooks that invalidate reactive readers when it or its embedded children change.
    * @param {foundry.abstract.Document} doc - The Document to wrap.
    */
   constructor(doc) {
      /** @type {foundry.abstract.Document} The live Document; source of truth for reads and writes. */
      this.doc = doc;

      // Register reactivity: invalidate reactive readers whenever this document — or one of its
      // embedded items/effects — changes. createSubscriber tears these hooks down automatically when
      // the last reactive reader unsubscribes (i.e. when the consuming UI unmounts).
      this.#subscribe = createSubscriber((update) => {
         const name = doc.documentName;

         /**
          * Invalidate when this document itself updates.
          * @param {foundry.abstract.Document} changed - The updated document.
          * @param {object} _diff - The change diff (unused).
          * @param {object} options - Flags accompanying the update, including whether diffing was applied.
          */
         const onUpdate = (changed, _diff, options) => {
            if (options?.diff === false) {
               return;
            }
            if (changed?.uuid === this.doc.uuid) {
               update();
            }
         };

         /**
          * Invalidate when an embedded item/effect belonging to this document changes. Documents are compared by
          * `uuid`: an unlinked token's synthetic actor shares its base actor's `id` and has its own `uuid`.
          * @param {foundry.abstract.Document} embedded - The embedded document.
          */
         const onEmbedded = (embedded) => {
            const parent = embedded?.parent;
            if (parent?.uuid === this.doc.uuid || parent?.parent?.uuid === this.doc.uuid) {
               update();
            }
         };

         /** @type {Set<string>} The document names of this document's ancestors (an Item's Actor, ...). */
         const ancestorNames = new Set();
         for (let ancestor = doc.parent; ancestor; ancestor = ancestor.parent) {
            ancestorNames.add(ancestor.documentName);
         }

         /**
          * Invalidate when an ancestor's ownership changes: this document's permissions come from its parent, and no
          * update hook of this document fires for the change. Other updates of an ancestor do not invalidate.
          * @param {foundry.abstract.Document} changed - The updated document.
          * @param {object} diff - The change diff.
          * @param {object} options - Flags accompanying the update.
          */
         const onAncestorUpdate = (changed, diff, options) => {
            if (options?.diff === false || !diff || !Object.hasOwn(diff, 'ownership')) {
               return;
            }
            for (let ancestor = this.doc.parent; ancestor; ancestor = ancestor.parent) {
               if (ancestor.uuid === changed?.uuid) {
                  update();
                  return;
               }
            }
         };

         const registered = [
            ...[...ancestorNames].map((ancestorName) => [
               `update${ancestorName}`,
               Hooks.on(`update${ancestorName}`, onAncestorUpdate),
            ]),
            [
               `update${name}`,
               Hooks.on(`update${name}`, onUpdate),
            ],
            [
               'createItem',
               Hooks.on('createItem', onEmbedded),
            ],
            [
               'updateItem',
               Hooks.on('updateItem', onEmbedded),
            ],
            [
               'deleteItem',
               Hooks.on('deleteItem', onEmbedded),
            ],
            [
               'createActiveEffect',
               Hooks.on('createActiveEffect', onEmbedded),
            ],
            [
               'updateActiveEffect',
               Hooks.on('updateActiveEffect', onEmbedded),
            ],
            [
               'deleteActiveEffect',
               Hooks.on('deleteActiveEffect', onEmbedded),
            ],
         ];

         return () => registered.forEach(([hook, id]) => Hooks.off(hook, id));
      });
   }

   /**
    * The live document, made reactive when read in a component or `$derived`: reading it subscribes
    * to the document's update hooks so the reader re-runs on change.
    * @returns {foundry.abstract.Document} The live document.
    */
   get data() {
      this.#subscribe();
      return this.doc;
   }

   /**
    * Cleanup hook invoked by consumers on teardown (sheet close, chat-message delete). The `.data`
    * subscriber tears down its own hooks automatically when the last reactive reader unsubscribes
    * (on unmount), so this is a no-op retained for caller compatibility.
    */
   destroy() {
      // Intentionally empty — createSubscriber handles hook teardown on unsubscribe.
   }
}
