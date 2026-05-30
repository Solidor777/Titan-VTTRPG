import TitanItemDataModel from '~/document/types/item/TitanItemDataModel.js';
import RulesElementMixin from '~/document/types/item/rules-element/RulesElementMixin.js';

/**
 * Data model with extra functionality for items that can contain Rules Elements.
 * @extends {TitanItemDataModel}
 */
export default class RulesElementItemDataModel extends RulesElementMixin(TitanItemDataModel) {
}
