import { createSubscriber } from 'svelte/reactivity';

/**
 * @class ReactiveDocument
 * Bridges a Foundry Document into Svelte 5 reactivity. Reads go through `.data` (a $state snapshot
 * refreshed from Foundry update hooks). Writes go through `doc.update(...)`. A temporary store-compat
 * shim (`subscribe`/`destroy`) lets legacy `$document` components keep working during the migration;
 * remove the shim once no `$document` readers remain.
 */
export default class ReactiveDocument {
   /** @type {object} The reactive snapshot of document data. */
   #snapshot = $state({});

   /** @type {() => void} Subscriber registration returned by createSubscriber. */
   #subscribe;

   /** @type {number[]} Hook ids registered by the store-compat shim. */
   #shimHooks = [];

   /**
    * @param {foundry.abstract.Document} doc - The Document to wrap.
    */
   constructor(doc) {
      /** @type {foundry.abstract.Document} The live Document; source of truth for writes. */
      this.doc = doc;

      // Seed the snapshot so components never read an empty object on first render.
      Object.assign(this.#snapshot, this.#capture());

      // Register reactivity: refresh the snapshot whenever Foundry updates this document.
      this.#subscribe = createSubscriber((update) => {
         const name = doc.documentName;
         const onUpdate = Hooks.on(`update${name}`, (changed, _diff, options) => {
            if (options?.diff === false) {
               return;
            }
            if (changed?.id !== this.doc.id) {
               return;
            }
            Object.assign(this.#snapshot, this.#capture());
            update();
         });

         return () => {
            Hooks.off(`update${name}`, onUpdate);
         };
      });
   }

   /**
    * The reactive data snapshot. Read inside a component or `$derived` to opt in to reactivity.
    * @returns {object} The reactive snapshot.
    */
   get data() {
      this.#subscribe();
      return this.#snapshot;
   }

   /**
    * Builds a plain snapshot of the document's reactive fields. `doc.system` already holds derived
    * data at read time, so this captures TITAN's prepared values.
    * @returns {object} A plain snapshot.
    * @protected
    */
   #capture() {
      return {
         name: this.doc.name,
         img: this.doc.img,
         isOwner: this.doc.isOwner,
         system: foundry.utils.deepClone(this.doc.system),
         flags: foundry.utils.deepClone(this.doc.flags),
      };
   }

   /**
    * TEMPORARY store-compat shim. Implements Svelte's store contract so legacy components that read
    * `$document` keep working through the migration. Pushes the live document on every relevant
    * update hook. Remove this method (and `destroy`) in the final phase.
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
    * Tears down all store-compat shim hooks. Call when the consuming UI is destroyed.
    */
   destroy() {
      const name = this.doc.documentName;
      this.#shimHooks.forEach((id) => Hooks.off(`update${name}`, id));
      this.#shimHooks = [];
   }
}
