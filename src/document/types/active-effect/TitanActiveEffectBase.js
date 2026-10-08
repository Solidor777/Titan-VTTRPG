import TitanDataModelMixin from '~/document/data-model/TitanDataModelMixin.js';

/**
 * Core's Active Effect data model (foundry.data.ActiveEffectTypeDataModel, which owns the `changes` field) with the
 * TITAN data model behaviour applied. The shared base of every TITAN Active Effect subtype data model.
 * @type {ReturnType<typeof TitanDataModelMixin<typeof foundry.data.ActiveEffectTypeDataModel>>}
 */
const TitanActiveEffectBase = TitanDataModelMixin(foundry.data.ActiveEffectTypeDataModel);

export default TitanActiveEffectBase;
