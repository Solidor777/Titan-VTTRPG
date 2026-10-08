import createNumberField from '~/helpers/utility-functions/CreateNumberField.js';

/**
 * Instance members the mixin adds.
 * @typedef {object} TitanDataModelMembers
 * @property {object} components - The frozen map of the data model's components.
 * @property {(data: object) => void} onPreCreate - Applies the initial document data before creation.
 * @property {() => void} prepareDerivedData - Prepares component derived data, then the base class's.
 * @property {() => object} getRollData - The base roll data (id, name, img, type).
 */

/**
 * Static members the mixin adds.
 * @typedef {object} TitanDataModelStatics
 * @property {number} latestVersion - The data model's latest version number.
 * @property {() => object} _defineDocumentSchema - The document schema, excluding component schemas.
 * @property {(source: object) => object} _migrateComponentData - Migrates each component's data.
 */

/**
 * Mixin that adds the TITAN data model behaviour (frozen component map, documentVersion field, version-aware
 * migrateData, onPreCreate initial data, roll data base) to a Foundry data model class. Applying it to
 * foundry.abstract.TypeDataModel yields TitanDataModel; applying it to a specialized core model, such as
 * foundry.data.ActiveEffectTypeDataModel, keeps that model's schema and behaviour.
 * Fields the base class defines in its own `defineSchema` are merged by the mixin's `defineSchema`. INVARIANT: a
 * class that overrides `_defineDocumentSchema` spreads `super._defineDocumentSchema()` so `documentVersion` (and the
 * fields of an inner mixin such as RulesElementMixin) are kept.
 * @template {typeof foundry.abstract.TypeDataModel} T
 * @param {T} BaseClass - The data model class to extend.
 * @returns {T & TitanDataModelStatics & (new (...args: ConstructorParameters<T>) =>
 * InstanceType<T> & TitanDataModelMembers)} The extended class with TITAN data model behaviour.
 */
export default function TitanDataModelMixin(BaseClass) {
   return class TitanDataModelBase extends BaseClass {
      /**
       * Map of the object's components, sorted by Name and Component Class.
       * @type {object}
       * @private
       */
      #components;

      /**
       * Builds and freezes the component map, exposing each component as a getter on the data model instance.
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
       * Defines the full schema for this document: the base class's own schema (empty for a plain TypeDataModel,
       * the core fields for a specialized core model), the document schema, and all component schemas.
       * @override
       * @returns {object} The complete document schema.
       */
      static defineSchema() {
         // A plain TypeDataModel inherits DataModel.defineSchema, which throws; it contributes no fields.
         /** @type {object} */
         const inheritedSchema = BaseClass.defineSchema === foundry.abstract.DataModel.defineSchema ?
            {} : super.defineSchema();
         const documentSchema = {
            ...inheritedSchema,
            ...this._defineDocumentSchema(),
         };

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
       * Defines the schema for the document, excluding component schemas which are added by defineSchema.
       * @returns {object} The document schema, excluding component schemas.
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
         for (const component of Object.values(this._prototypeComponents)) {
            if (typeof component.migrateData === 'function') {
               component.migrateData(source);
            }
         }
         return source;
      }

      /**
       * Perform preliminary operations before a data model of this type is created.
       * Pre-creation operations only occur for the client which requested the operation.
       * Modifications to the pending document before it is persisted should be performed with
       * this.parent.updateSource().
       * @param {object} data - The initial data object provided to the document creation request.
       */
      onPreCreate(data) {
         // Initialize document data.
         const documentData = this._getInitialDocumentData(data);
         if (documentData) {
            this.parent.updateSource(documentData);
         }
      }

      /**
       * Gets the initial data for this document.
       * @param {object} data - The initial data object provided to the document creation request.
       * @returns {object | void} The initial data to update the document with.
       * @protected
       */
      _getInitialDocumentData(data) {
      }

      /**
       * Apply transformations of derivations to the values of the source data object.
       * Compute data fields whose values are not stored in the database.
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
         for (const component of Object.values(this.components)) {
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
   };
}
