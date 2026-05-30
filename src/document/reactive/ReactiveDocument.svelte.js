import { createSubscriber } from 'svelte/reactivity';

/**
 * @class ReactiveDocument
 * Bridges a Foundry Document into Svelte 5 reactivity. `.data` returns the LIVE document; when read
 * inside a component or `$derived` it subscribes to the document's update hooks (including embedded
 * item/effect CRUD), so reactive readers re-run whenever the document changes. Because `.data` is the
 * live document, reactive reads (`.data.system.x`), writes (`.data.update(...)`), collections
 * (`.data.items`), and methods (`.data.system.someMethod()`) all work through the same accessor.
 */
export default class ReactiveDocument {
   /** @type {() => void} Subscriber registration returned by createSubscriber. */
   #subscribe;

   /** @type {number[]} Hook ids registered by the temporary store-compat shim. */
   #shimHooks = [];

   /**
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
          * @param {object} options - Update options.
          */
         const onUpdate = (changed, _diff, options) => {
            if (options?.diff === false) {
               return;
            }
            if (changed?.id === this.doc.id) {
               update();
            }
         };

         /**
          * Invalidate when an embedded item/effect belonging to this document changes.
          * @param {foundry.abstract.Document} embedded - The embedded document.
          */
         const onEmbedded = (embedded) => {
            const parent = embedded?.parent;
            if (parent?.id === this.doc.id || parent?.parent?.id === this.doc.id) {
               update();
            }
         };

         const registered = [
            [`update${name}`, Hooks.on(`update${name}`, onUpdate)],
            ['createItem', Hooks.on('createItem', onEmbedded)],
            ['updateItem', Hooks.on('updateItem', onEmbedded)],
            ['deleteItem', Hooks.on('deleteItem', onEmbedded)],
            ['createActiveEffect', Hooks.on('createActiveEffect', onEmbedded)],
            ['updateActiveEffect', Hooks.on('updateActiveEffect', onEmbedded)],
            ['deleteActiveEffect', Hooks.on('deleteActiveEffect', onEmbedded)],
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
    * TEMPORARY store-compat shim. Lets not-yet-migrated components that read `$document` keep working
    * during the `$document`→`document.data` migration. Removed once no `$document` readers remain.
    * @param {(value: foundry.abstract.Document) => void} run - Svelte store subscriber callback.
    * @returns {() => void} Unsubscribe function.
    */
   subscribe(run) {
      run(this.doc);
      const name = this.doc.documentName;
      const id = Hooks.on(`update${name}`, () => run(this.doc));
      this.#shimHooks.push(id);
      return () => {
         Hooks.off(`update${name}`, id);
      };
   }

   /**
    * Tears down the temporary store-compat shim hooks. The `.data` subscriber tears down its own
    * hooks automatically when the last reactive reader unsubscribes; this only cleans up the shim.
    */
   destroy() {
      const name = this.doc.documentName;
      this.#shimHooks.forEach((id) => Hooks.off(`update${name}`, id));
      this.#shimHooks = [];
   }
}
