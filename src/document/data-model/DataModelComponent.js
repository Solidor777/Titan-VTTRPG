/**
 * Class for adding a re-usable svelte-components to a data model.
 */
export default class DataModelComponent {
   // Reference to the parent data model.
   #parent;

   /**
    * Class for adding a re-usable svelte-components to a data model.
    * @param {TitanDataModel} parent - The parent data model this svelte-components is associated with.
    */
   constructor(parent) {
      this.#parent = parent;
   }

   /**
    * Getter for the parent data model.
    * @returns {TitanDataModel} - The parent data model this svelte-components is associated with.
    */
   get parent() {
      return this.#parent;
   }
}
