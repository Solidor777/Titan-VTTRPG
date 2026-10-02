/**
 * @class ProbeDocument
 * A synthetic stand-in for `ReactiveDocument`, for probe mounts of components that read `getContext('document')`.
 * `.data` returns a plain object whose `update(changes)` merges the changes into it and invalidates every reactive
 * reader of `.data`, as a Foundry document's update hook does for the real bridge. Probe bundle only; never part of a
 * system build.
 */
export default class ProbeDocument {
   /** @type {number} Counter that readers of `.data` subscribe to; `update` increments it. */
   #version = $state(0);

   /** @type {object} The plain data object the components read and write. */
   #data;

   /**
    * Builds the synthetic document around plain data.
    * @param {object} data - The data the components see: `isOwner` and `system`.
    */
   constructor(data) {
      this.#data = data;
      /**
       * Merges changes into the data and re-renders its readers.
       * @param {object} changes - The changes to merge, in the shape of a document update.
       * @returns {Promise<void>} Resolves once the changes are merged.
       */
      this.#data.update = async (changes) => {
         foundry.utils.mergeObject(this.#data, changes);
         this.#version += 1;
      };
   }

   /**
    * The synthetic document data; reading it inside a component or `$derived` subscribes the reader to `update`.
    * @returns {object} The plain data object.
    */
   get data() {
      void this.#version;
      return this.#data;
   }
}
