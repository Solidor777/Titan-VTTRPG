import createItemSystemTemplate from '~/document/types/item/ItemSystemTemplate.js';

/**
 * Creates the canonical plain-object shape of a Commodity's `system` data, mirroring
 * `CommodityDataModel._defineDocumentSchema()`. Commodities do NOT carry rules elements, so the
 * rules-element fragment is intentionally omitted. Built by spreading the shared base fragment, then
 * adding the commodity-specific fields (rarity, value, quantity) whose runtime types drive the schema
 * produced by `buildSchemaFromShape`.
 * @returns {object} The Commodity `system` shape template.
 */
export default function createCommoditySystemTemplate() {
   return {
      ...createItemSystemTemplate(),

      // Rarity tier of the commodity.
      rarity: 'common',

      // Monetary value of the commodity.
      value: 0,

      // Quantity of the commodity held.
      quantity: 1,
   };
}
