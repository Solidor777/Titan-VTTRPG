import TitanTypeComponent from '~/helpers/TypeComponent';

export default class TitanPlayerComponent extends TitanTypeComponent {
  // Prepare Player type specific data
  prepareDerivedData() {
    // Make modifications to data here.
    const systemData = this.parent.system;

    // Calculate the amount of EXP spent
    let spentExp = 0;

    // Add cost of current attribute
    for (const attribute in systemData.attribute) {
      const attributeBaseValue = systemData.attribute[attribute].baseValue;

      // Calculate xp cost
      const minAttributeValue = CONFIG.TITAN.constants.attribute.min;
      if (attributeBaseValue > minAttributeValue) {
        spentExp +=
          CONFIG.TITAN.constants.attribute.totalExpCostByRank[
          attributeBaseValue - minAttributeValue - 1
          ];
      }
    }

    // Add cost of current skill
    for (const skill in systemData.skill) {
      const skillData = systemData.skill[skill];

      // Calculate xp cost of training
      const skillTrainingBaseValue = skillData.training.baseValue;
      if (skillTrainingBaseValue > 0) {
        spentExp +=
          CONFIG.TITAN.constants.skill.training.totalExpCostByRank[
          skillTrainingBaseValue - 1
          ];
      }

      // Calculate xp cost of training
      const skillExpertiseBaseValue = skillData.expertise.baseValue;
      if (skillExpertiseBaseValue > 0) {
        spentExp +=
          CONFIG.TITAN.constants.skill.expertise.totalExpCostByRank[
          skillExpertiseBaseValue - 1
          ];
      }
    }

    systemData.exp.available = systemData.exp.earned - spentExp;
  }

  return;
}