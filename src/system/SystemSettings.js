/**
 * Registers the settings for the Titan system.
 */
export default function registerSystemSettings() {

   // Get Check Options
   game.settings.register('titan', 'getCheckOptions', {
      config: true,
      default: false,
      hint: 'SETTINGS.getCheckOptions.hint',
      name: 'SETTINGS.getCheckOptions.label',
      scope: 'client',
      type: Boolean,
   });

   // Confirm Deleting Items
   game.settings.register('titan', 'confirmDeletingItems', {
      config: true,
      default: true,
      hint: 'SETTINGS.confirmDeletingItems.hint',
      name: 'SETTINGS.confirmDeletingItems.label',
      scope: 'client',
      type: Boolean,
   });

   // Auto-open Combatant Sheets for Players
   game.settings.register('titan', 'autoOpenCharacterSheetsPlayer', {
      config: true,
      default: true,
      hint: 'SETTINGS.autoOpenCharacterSheetsPlayer.hint',
      name: 'SETTINGS.autoOpenCharacterSheetsPlayer.label',
      scope: 'client',
      type: Boolean,
   });

   // Auto-open Combatant Sheets for GMs
   game.settings.register('titan', 'autoOpenCharacterSheetsGM', {
      choices: {
         npcsOnly: 'SETTINGS.autoOpenCharacterSheetsGM.npcsOnly',
         pcsOnly: 'SETTINGS.autoOpenCharacterSheetsGM.pcsOnly',
         all: 'SETTINGS.autoOpenCharacterSheetsGM.all',
         disabled: 'SETTINGS.autoOpenCharacterSheetsGM.disabled',
      },
      config: true,
      default: 'npcsOnly',
      hint: 'SETTINGS.autoOpenCharacterSheetsGM.hint',
      name: 'SETTINGS.autoOpenCharacterSheetsGM.label',
      restricted: true,
      scope: 'client',
      type: String,
   });

   // Dark Mode Sheets
   game.settings.register('titan', 'darkModeSheets', {
      config: true,
      default: true,
      hint: 'SETTINGS.darkModeSheets.hint',
      name: 'SETTINGS.darkModeSheets.label',
      requiresReload: true,
      scope: 'client',
      type: Boolean,
   });

   // Dark Mode Chat Messages
   game.settings.register('titan', 'darkModeChatMessages', {
      choices: {
         all: 'SETTINGS.darkModeChatMessages.all',
         systemOnly: 'SETTINGS.darkModeChatMessages.systemOnly',
         disabled: 'SETTINGS.darkModeChatMessages.disabled',
      },
      config: true,
      default: 'all',
      hint: 'SETTINGS.darkModeChatMessages.hint',
      name: 'SETTINGS.darkModeChatMessages.label',
      requiresReload: true,
      scope: 'client',
      type: String,
   });

   // Dark Mode Journals
   game.settings.register('titan', 'darkModeJournals', {
      config: true,
      default: true,
      hint: 'SETTINGS.darkModeJournals.hint',
      name: 'SETTINGS.darkModeJournals.label',
      requiresReload: true,
      scope: 'client',
      type: Boolean,
   });

   // Initiative Formula
   game.settings.register('titan', 'initiativeFormula', {
      config: true,
      default: '+2d6',
      hint: 'SETTINGS.initiativeFormula.hint',
      name: 'SETTINGS.initiativeFormula.label',
      restricted: true,
      scope: 'world',
      type: String,
   });

   // Auto-regain Resolve
   game.settings.register('titan', 'autoRegainResolve', {
      choices: {
         enabled: 'SETTINGS.autoRegainResolve.enabled',
         showButton: 'SETTINGS.autoRegainResolve.showButton',
         disabled: 'SETTINGS.autoRegainResolve.disabled',
      },
      config: true,
      default: 'enabled',
      hint: 'SETTINGS.autoRegainResolve.hint',
      name: 'SETTINGS.autoRegainResolve.label',
      requiresReload: true,
      restricted: true,
      scope: 'world',
      type: String,
   });

   // Auto-spend Resolve when Doubling Training
   game.settings.register('titan', 'autoSpendResolveDoubleTraining', {
      config: true,
      default: true,
      hint: 'SETTINGS.autoSpendResolveDoubleTraining.hint',
      name: 'SETTINGS.autoSpendResolveDoubleTraining.label',
      requiresReload: true,
      scope: 'client',
      type: Boolean,
   });

   // Auto-spend Resolve when Doubling Expertise
   game.settings.register('titan', 'autoSpendResolveDoubleExpertise', {
      config: true,
      default: true,
      hint: 'SETTINGS.autoSpendResolveDoubleExpertise.hint',
      name: 'SETTINGS.autoSpendResolveDoubleExpertise.label',
      requiresReload: true,
      scope: 'client',
      type: Boolean,
   });

   // Auto-spend Resolve when Re-Rolling Failures
   game.settings.register('titan', 'autoSpendResolveReRollFailures', {
      config: true,
      default: true,
      hint: 'SETTINGS.autoSpendResolveReRollFailures.hint',
      name: 'SETTINGS.autoSpendResolveReRollFailures.label',
      requiresReload: true,
      scope: 'client',
      type: Boolean,
   });

   // Auto-spend Resolve when Checks have a Resolve Cost
   game.settings.register('titan', 'autoSpendResolveChecks', {
      config: true,
      default: true,
      hint: 'SETTINGS.autoSpendResolveChecks.hint',
      name: 'SETTINGS.autoSpendResolveChecks.label',
      requiresReload: true,
      scope: 'client',
      type: Boolean,
   });

   // Auto-apply Fast Healing to Combatants
   game.settings.register('titan', 'autoApplyFastHealing', {
      choices: {
         enabled: 'SETTINGS.autoApplyFastHealing.enabled',
         showButton: 'SETTINGS.autoApplyFastHealing.showButton',
         disabled: 'SETTINGS.autoApplyFastHealing.disabled',
      },
      config: true,
      default: 'enabled',
      hint: 'SETTINGS.autoApplyFastHealing.hint',
      name: 'SETTINGS.autoApplyFastHealing.label',
      requiresReload: true,
      restricted: true,
      scope: 'world',
      type: String,
   });

   // Auto-apply Persistent Damage to Combatants
   game.settings.register('titan', 'autoApplyPersistentDamage', {
      choices: {
         enabled: 'SETTINGS.autoApplyPersistentDamage.enabled',
         showButton: 'SETTINGS.autoApplyPersistentDamage.showButton',
         disabled: 'SETTINGS.autoApplyPersistentDamage.disabled',
      },
      config: true,
      default: 'enabled',
      hint: 'SETTINGS.autoApplyPersistentDamage.hint',
      name: 'SETTINGS.autoApplyPersistentDamage.label',
      requiresReload: true,
      restricted: true,
      scope: 'world',
      type: String,
   });

   // Auto-decrease the Duration of Effects for Combatants
   game.settings.register('titan', 'autoDecreaseEffectDuration', {
      config: true,
      default: true,
      hint: 'SETTINGS.autoDecreaseEffectDuration.hint',
      name: 'SETTINGS.autoDecreaseEffectDuration.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Auto-remove Expired Effects from Combatants
   game.settings.register('titan', 'autoRemoveExpiredEffects', {
      choices: {
         enabled: 'SETTINGS.autoRemoveExpiredEffects.enabled',
         showButton: 'SETTINGS.autoRemoveExpiredEffects.showButton',
         disabled: 'SETTINGS.autoRemoveExpiredEffects.disabled',
      },
      config: true,
      default: 'enabled',
      hint: 'SETTINGS.autoRemoveExpiredEffects.hint',
      name: 'SETTINGS.autoRemoveExpiredEffects.label',
      requiresReload: true,
      restricted: true,
      scope: 'world',
      type: String,
   });

   // Report taking Damage
   game.settings.register('titan', 'reportTakingDamage', {
      config: true,
      default: true,
      hint: 'SETTINGS.reportTakingDamage.hint',
      name: 'SETTINGS.reportTakingDamage.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Report Healing Damage
   game.settings.register('titan', 'reportHealingDamage', {
      config: true,
      default: true,
      hint: 'SETTINGS.reportHealingDamage.hint',
      name: 'SETTINGS.reportHealingDamage.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Report Rending Armor
   game.settings.register('titan', 'reportRendingArmor', {
      config: true,
      default: true,
      hint: 'SETTINGS.reportRendingArmor.hint',
      name: 'SETTINGS.reportRendingArmor.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Report Repairing Armor
   game.settings.register('titan', 'reportRepairingArmor', {
      config: true,
      default: true,
      hint: 'SETTINGS.reportRepairingArmor.hint',
      name: 'SETTINGS.reportRepairingArmor.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Report Spending Resolve
   game.settings.register('titan', 'reportSpendingResolve', {
      config: true,
      default: true,
      hint: 'SETTINGS.reportSpendingResolve.hint',
      name: 'SETTINGS.reportSpendingResolve.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Report Regaining Resolve
   game.settings.register('titan', 'reportRegainingResolve', {
      config: true,
      default: true,
      hint: 'SETTINGS.reportRegainingResolve.hint',
      name: 'SETTINGS.reportRegainingResolve.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Report Resting
   game.settings.register('titan', 'reportResting', {
      config: true,
      default: true,
      hint: 'SETTINGS.reportResting.hint',
      name: 'SETTINGS.reportResting.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Report a Combatant's Effects at the Start and End of their Turn
   game.settings.register('titan', 'reportEffects', {
      config: true,
      default: true,
      hint: 'SETTINGS.reportEffects.hint',
      name: 'SETTINGS.reportEffects.label',
      restricted: true,
      scope: 'world',
      type: Boolean,
   });

   // Base multiplier for a Character's maximum Stamina
   game.settings.register('titan', 'staminaBaseMultiplier', {
      config: true,
      default: 2,
      hint: 'SETTINGS.staminaBaseMultiplier.hint',
      name: 'SETTINGS.staminaBaseMultiplier.label',
      restricted: true,
      scope: 'world',
      type: Number,
   });

   // Base multiplier for a Minion or Warrior's maximum Stamina
   game.settings.register('titan', 'minionStaminaMultiplier', {
      config: true,
      default: 0.5,
      hint: 'SETTINGS.minionStaminaMultiplier.hint',
      name: 'SETTINGS.minionStaminaMultiplier.label',
      restricted: true,
      scope: 'world',
      type: Number,
   });

   // Base multiplier for a Character's maximum Resolve
   game.settings.register('titan', 'resolveBaseMultiplier', {
      config: true,
      default: 0.5,
      hint: 'SETTINGS.resolveBaseMultiplier.hint',
      name: 'SETTINGS.resolveBaseMultiplier.label',
      restricted: true,
      scope: 'world',
      type: Number,
   });

   // Base multiplier for a Character's maximum Wounds
   game.settings.register('titan', 'woundsBaseMultiplier', {
      config: true,
      default: 0.5,
      hint: 'SETTINGS.woundsBaseMultiplier.hint',
      name: 'SETTINGS.woundsBaseMultiplier.label',
      restricted: true,
      scope: 'world',
      type: Number,
   });

   // Base Wounds Healed every time a Character takes a Long Rest
   game.settings.register('titan', 'woundsBaseRegain', {
      config: true,
      default: 1,
      hint: 'SETTINGS.woundsBaseRegain.hint',
      name: 'SETTINGS.woundsBaseRegain.label',
      range: {
         min: 0,
         max: 10,
         step: 1,
      },
      restricted: true,
      scope: 'world',
      type: Number,
   });

   // Base Resolve Regained at the start of a Combatant's turn
   game.settings.register('titan', 'resolveBaseRegain', {
      config: true,
      default: 1,
      hint: 'SETTINGS.resolveBaseRegain.hint',
      name: 'SETTINGS.resolveBaseRegain.label',
      range: {
         min: 0,
         max: 10,
         step: 1,
      },
      restricted: true,
      scope: 'world',
      type: Number,
   });

   // Whether to confirm requests to regenerate a Document's Unique Identifier
   game.settings.register('titan', 'confirmRegenerateUUID', {
      config: true,
      default: true,
      hint: 'SETTINGS.confirmRegenerateUUID.hint',
      name: 'SETTINGS.confirmRegenerateUUID.label',
      restricted: true,
      scope: 'client',
      type: Boolean,
   });

   // Function for create settings data for the default Attribute of a Skill Check
   /**
    * @param skill
    * @param defaultAttribute
    */
   function createDefaultSkillAttributeSettings(skill, defaultAttribute) {
      game.settings.register('titan', `defaultAttribute.${skill}`, {
         choices: {
            body: 'LOCAL.body.label',
            mind: 'LOCAL.mind.label',
            soul: 'LOCAL.soul.label',
         },
         config: true,
         default: defaultAttribute,
         hint: `SETTINGS.defaultAttribute.${skill}.hint`,
         name: `SETTINGS.defaultAttribute.${skill}.label`,
         restricted: true,
         scope: 'world',
         type: String,
      });
   }

   // Register default Attributes for Skills
   createDefaultSkillAttributeSettings('arcana', 'mind');
   createDefaultSkillAttributeSettings('athletics', 'body');
   createDefaultSkillAttributeSettings('deception', 'mind');
   createDefaultSkillAttributeSettings('dexterity', 'body');
   createDefaultSkillAttributeSettings('diplomacy', 'soul');
   createDefaultSkillAttributeSettings('engineering', 'mind');
   createDefaultSkillAttributeSettings('intimidation', 'body');
   createDefaultSkillAttributeSettings('investigation', 'mind');
   createDefaultSkillAttributeSettings('lore', 'mind');
   createDefaultSkillAttributeSettings('medicine', 'mind');
   createDefaultSkillAttributeSettings('meleeWeapons', 'body');
   createDefaultSkillAttributeSettings('metaphysics', 'soul');
   createDefaultSkillAttributeSettings('nature', 'mind');
   createDefaultSkillAttributeSettings('perception', 'mind');
   createDefaultSkillAttributeSettings('performance', 'soul');
   createDefaultSkillAttributeSettings('rangedWeapons', 'body');
   createDefaultSkillAttributeSettings('subterfuge', 'mind');
   createDefaultSkillAttributeSettings('stealth', 'body');

   // Default XP cost for Abilities
   game.settings.register('titan', 'defaultXpCost.ability', {
      config: true,
      default: 2,
      hint: 'SETTINGS.defaultXpCost.ability.hint',
      name: 'SETTINGS.defaultXpCost.ability.label',
      restricted: true,
      scope: 'client',
      type: Number,
   });

   // Default XP cost for Spells
   game.settings.register('titan', 'defaultXpCost.spell', {
      config: true,
      default: 0,
      hint: 'SETTINGS.defaultXpCost.spell.hint',
      name: 'SETTINGS.defaultXpCost.spell.label',
      restricted: true,
      scope: 'client',
      type: Number,
   });
}
