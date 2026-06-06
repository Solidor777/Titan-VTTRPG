/**
 * @class EmbeddedDocument
 * Bridges an embedded Foundry Document (Item / ActiveEffect) into Svelte 5 reactivity by delegating to the
 * nearest ancestor bridge (ReactiveDocument or another EmbeddedDocument). It registers no hooks of its own:
 * reading `.data` resolves the live embedded document through the ancestor's reactive `.data` accessor, so
 * readers subscribe to the ancestor's createSubscriber and re-resolve by id on every invalidation — the
 * reference is never stale, and nesting (effect on item on actor) chains for free.
 */
export default class EmbeddedDocument {
   /** @type {object} The nearest ancestor bridge (ReactiveDocument | EmbeddedDocument). */
   #parent;

   /** @type {string} The embedded collection name on the parent document ('items' | 'effects'). */
   #collection;

   /** @type {string} The embedded document's id within the parent collection. */
   #id;

   /**
    * Stores the ancestor bridge, collection name, and embedded id used to re-resolve the live document.
    * @param {object} parent - The nearest ancestor bridge (ReactiveDocument | EmbeddedDocument).
    * @param {string} collection - The embedded collection name ('items' | 'effects').
    * @param {string} id - The embedded document id.
    */
   constructor(parent, collection, id) {
      this.#parent = parent;
      this.#collection = collection;
      this.#id = id;
   }

   /**
    * The live embedded document, made reactive when read in a component or `$derived`: reading the parent
    * bridge's `.data` subscribes to the ancestor document's update hooks, and the embedded document is then
    * re-resolved by id so the reference is never stale.
    * @returns {foundry.abstract.Document|undefined} The live embedded document, or undefined when missing.
    */
   get data() {
      return this.#parent.data?.[this.#collection]?.get(this.#id);
   }

   /**
    * The raw (non-subscribing) live embedded document, for write-back call sites that must not register a
    * reactive dependency (mirrors ReactiveDocument's `.doc`).
    * @returns {foundry.abstract.Document|undefined} The live embedded document, or undefined when missing.
    */
   get doc() {
      return this.#parent.doc?.[this.#collection]?.get(this.#id);
   }

   /**
    * Cleanup hook retained for accessor parity with ReactiveDocument. The ancestor bridge owns all hook
    * registration and teardown, so there is nothing to release here.
    */
   destroy() {
      // Intentionally empty — the ancestor bridge owns hook registration and teardown.
   }
}
