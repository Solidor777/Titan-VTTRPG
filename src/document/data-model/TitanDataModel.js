import createNumberField from '~/helpers/utility-functions/CreateNumberField.js';

/**
 * A specialized subclass of TypeDataModel,
 * with extra functionality to support data model components and version
 * migrations.
 * @extends {foundry.abstract.TypeDataModel}
 */
export default class TitanDataModel extends foundry.abstract.TypeDataModel {
   /**
    * Map of the object's components, sorted by Name and Component
    * Class.
    * @type {object}
    * @private
    */
   #components;

   /**
    * @param {object} data - The initial data for this data model.
    * @param {object} options - Options passed to the parent TypeDataModel.
    */
   constructor(data, options) {
      super(data, options);

      // Construct and freeze the components map.
      /** @type {object} */
      const components = {};
      for (const [key, component] of Object.entries(this.constructor._prototypeComponents)) {
         components[key] = new component(this);
         Object.defineProperty(this, key, {
            get() {
               return this.#components[key];
            },
         });
      }
      this.#components = Object.freeze(components);
   }

   /**
    * Static getter for the data model's latest version number.
    * @type {number}
    */
   static get latestVersion() {
      return 0;
   }

   /**
    * Static getter for the base components used for construction.
    * @type {object}
    * @protected
    */
   static get _prototypeComponents() {
      return {};
   }

   /**
    * Getter for the map of the data model's svelte components.
    * @returns {object} The map of the data model's svelte components.
    */
   get components() {
      return this.#components;
   }

   /**
    * Defines the full schema for this document, including all component
    * schemas.
    * @override
    * @returns {object} The complete document schema.
    */
   static defineSchema() {
      const documentSchema = this._defineDocumentSchema();

      // Add each component's schema to the document schema.
      for (const [key, component] of Object.entries(this._prototypeComponents)) {
         if (component.defineSchema !== undefined) {
            documentSchema[key] = component.defineSchema();
         }
      }
      return documentSchema;
   }

   /**
    * Migrates the source data for this document and all its components.
    * @override
    * @param {object} source - The source data for the document.
    * @returns {object} The migrated data.
    */
   static migrateData(source) {
      return super.migrateData(this._migrateComponentData(source));
   }

   /**
    * Defines the schema for the document, excluding component schemas
    * which are added by defineSchema.
    * @returns {object} The document schema, excluding component
    *    schemas.
    * @protected
    */
   static _defineDocumentSchema() {
      return {
         documentVersion: createNumberField(this.latestVersion),
      };
   }

   /**
    * Migrates the data for each component.
    * @param {object} source - The source data for the document.
    * @returns {object} The migrated data.
    * @protected
    */
   static _migrateComponentData(source) {
      for (const component of Object.entries(this._prototypeComponents)) {
         if (typeof component.migrateData === 'function') {
            component.migrateData(source);
         }
      }
      return source;
   }

   /**
    * Perform preliminary operations before a data model of this type is
    * created.
    * Pre-creation operations only occur for the client which requested the
    * operation.
    * Modifications to the pending document before it is persisted should be
    * performed with this.parent.updateSource().
    * @param {object} data - The initial data object provided to the document
    *    creation request.
    */
   onPreCreate(data) {
      // Initialize document data
      const documentData = this._getInitialDocumentData(data);
      if (documentData) {
         this.parent.updateSource(documentData);
      }
   }

   /**
    * Gets the initial data for this document.
    * @param {object} data - The initial data object provided to the document
    *    creation request.
    * @returns {object | void} The initial data to update the document with.
    * @protected
    */
   _getInitialDocumentData(data) {
   }

   /**
    * Apply transformations of derivations to the values of the source data
    * object.
    * Compute data fields whose values are not stored to the database.
    */
   prepareDerivedData() {
      this._prepareComponentDerivedData();
      super.prepareDerivedData();
   }

   /**
    * Prepares the derived data for each component.
    * @protected
    */
   _prepareComponentDerivedData() {
      for (const component of Object.entries(this.components)) {
         if (typeof component.prepareDerivedData === 'function') {
            component.prepareDerivedData();
         }
      }
   }

   /**
    * Gets the type-specific Roll Data for this document.
    * @returns {object} Type specific Roll Data for this document.
    */
   getRollData() {
      return {
         id: this.parent.id,
         name: this.parent.name,
         img: this.parent.img,
         type: this.parent.type,
      };
   }
}
