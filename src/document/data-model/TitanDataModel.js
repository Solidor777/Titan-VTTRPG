import TitanDataModelMixin from '~/document/data-model/TitanDataModelMixin.js';

/**
 * A specialized subclass of TypeDataModel, with extra functionality to support data model components and version
 * migrations. Built by applying TitanDataModelMixin to foundry.abstract.TypeDataModel.
 * @extends {foundry.abstract.TypeDataModel}
 */
export default class TitanDataModel extends TitanDataModelMixin(foundry.abstract.TypeDataModel) {
}
