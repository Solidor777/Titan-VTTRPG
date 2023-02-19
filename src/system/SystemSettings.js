export default function registerSystemSettings() {
   game.settings.register('titan', 'getCheckOptions', {
      config: true,
      scope: 'client',
      name: 'SETTINGS.getCheckOptions.label',
      hint: 'SETTINGS.getCheckOptions.hint',
      type: Boolean,
      default: false,
   });

   game.settings.register('titan', 'confirmDeletingItems', {
      config: true,
      scope: 'client',
      name: 'SETTINGS.confirmDeletingItems.label',
      hint: 'SETTINGS.confirmDeletingItems.hint',
      type: Boolean,
      default: true,
   });

   game.settings.register('titan', 'autoOpenCharacterSheetsPlayer', {
      config: true,
      scope: 'client',
      name: 'SETTINGS.autoOpenCharacterSheetsPlayer.label',
      hint: 'SETTINGS.autoOpenCharacterSheetsPlayer.hint',
      type: Boolean,
      default: true,
   });

   game.settings.register('titan', 'autoOpenCharacterSheetsGM', {
      config: true,
      scope: 'client',
      name: 'SETTINGS.autoOpenCharacterSheetsGM.label',
      hint: 'SETTINGS.autoOpenCharacterSheetsGM.hint',
      type: String,
      choices: {
         npcsOnly: 'SETTINGS.autoOpenCharacterSheetsGM.npcsOnly',
         pcsOnly: 'SETTINGS.autoOpenCharacterSheetsGM.pcsOnly',
         all: 'SETTINGS.autoOpenCharacterSheetsGM.all',
         disabled: 'SETTINGS.autoOpenCharacterSheetsGM.disabled',
      },
      restricted: true,
      default: 'npcsOnly',
   });

   game.settings.register('titan', 'darkModeSheets', {
      config: true,
      scope: 'client',
      name: 'SETTINGS.darkModeSheets.label',
      hint: 'SETTINGS.darkModeSheets.hint',
      type: Boolean,
      default: true,
      requiresReload: true
   });

   game.settings.register('titan', 'darkModeChatMessages', {
      config: true,
      scope: 'client',
      name: 'SETTINGS.darkModeChatMessages.label',
      hint: 'SETTINGS.darkModeChatMessages.hint',
      type: String,
      choices: {
         all: 'SETTINGS.darkModeChatMessages.all',
         systemOnly: 'SETTINGS.darkModeChatMessages.systemOnly',
         disabled: 'SETTINGS.darkModeChatMessages.disabled',
      },
      default: 'all',
      requiresReload: true
   });

   game.settings.register('titan', 'darkModeJournals', {
      config: true,
      scope: 'client',
      name: 'SETTINGS.darkModeJournals.label',
      hint: 'SETTINGS.darkModeJournals.hint',
      type: Boolean,
      default: true,
      requiresReload: true
   });

   game.settings.register('titan', 'initiativeFormula', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.initiativeFormula.label',
      hint: 'SETTINGS.initiativeFormula.hint',
      type: String,
      restricted: true,
      default: '+2d6',
   });

   game.settings.register('titan', 'autoRegainResolve', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoRegainResolve.label',
      hint: 'SETTINGS.autoRegainResolve.hint',
      type: String,
      choices: {
         enabled: 'SETTINGS.autoRegainResolve.enabled',
         showButton: 'SETTINGS.autoRegainResolve.showButton',
         disabled: 'SETTINGS.autoRegainResolve.disabled'
      },
      restricted: true,
      default: 'enabled',
      requiresReload: true,
   });

   game.settings.register('titan', 'autoSpendResolveDoubleTraining', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoSpendResolveDoubleTraining.label',
      hint: 'SETTINGS.autoSpendResolveDoubleTraining.hint',
      type: Boolean,
      restricted: true,
      default: true,
      requiresReload: true,
   });

   game.settings.register('titan', 'autoSpendResolveDoubleExpertise', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoSpendResolveDoubleExpertise.label',
      hint: 'SETTINGS.autoSpendResolveDoubleExpertise.hint',
      type: Boolean,
      restricted: true,
      default: true,
      requiresReload: true,
   });

   game.settings.register('titan', 'autoSpendResolveReRollFailures', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoSpendResolveReRollFailures.label',
      hint: 'SETTINGS.autoSpendResolveReRollFailures.hint',
      type: Boolean,
      restricted: true,
      default: true,
      requiresReload: true,
   });

   game.settings.register('titan', 'autoApplyFastHealing', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoApplyFastHealing.label',
      hint: 'SETTINGS.autoApplyFastHealing.hint',
      type: String,
      choices: {
         enabled: 'SETTINGS.autoApplyFastHealing.enabled',
         showButton: 'SETTINGS.autoApplyFastHealing.showButton',
         disabled: 'SETTINGS.autoApplyFastHealing.disabled'
      },
      restricted: true,
      default: 'enabled',
      requiresReload: true,
   });

   game.settings.register('titan', 'autoApplyPersistentDamage', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoApplyPersistentDamage.label',
      hint: 'SETTINGS.autoApplyPersistentDamage.hint',
      type: String,
      choices: {
         enabled: 'SETTINGS.autoApplyPersistentDamage.enabled',
         showButton: 'SETTINGS.autoApplyPersistentDamage.showButton',
         disabled: 'SETTINGS.autoApplyPersistentDamage.disabled'
      },
      restricted: true,
      default: 'enabled',
      requiresReload: true,
   });

   game.settings.register('titan', 'autoDecreaseEffectDuration', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoDecreaseEffectDuration.label',
      hint: 'SETTINGS.autoDecreaseEffectDuration.hint',
      type: Boolean,
      restricted: true,
      default: true,
   });

   game.settings.register('titan', 'autoRemoveExpiredEffects', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoRemoveExpiredEffects.label',
      hint: 'SETTINGS.autoRemoveExpiredEffects.hint',
      type: String,
      choices: {
         enabled: 'SETTINGS.autoRemoveExpiredEffects.enabled',
         showButton: 'SETTINGS.autoRemoveExpiredEffects.showButton',
         disabled: 'SETTINGS.autoRemoveExpiredEffects.disabled'
      },
      restricted: true,
      default: 'enabled',
      requiresReload: true,
   });

   game.settings.register('titan', 'reportTakingDamage', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.reportTakingDamage.label',
      hint: 'SETTINGS.reportTakingDamage.hint',
      type: String,
      choices: {
         owner: 'SETTINGS.reportTakingDamage.owner',
         gmOnly: 'SETTINGS.reportTakingDamage.gmOnly',
         none: 'SETTINGS.reportTakingDamage.disabled'
      },
      restricted: true,
      default: 'owner',
   });

   game.settings.register('titan', 'reportHealingDamage', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.reportHealingDamage.label',
      hint: 'SETTINGS.reportHealingDamage.hint',
      type: String,
      choices: {
         owner: 'SETTINGS.reportHealingDamage.owner',
         gmOnly: 'SETTINGS.reportHealingDamage.gmOnly',
         none: 'SETTINGS.reportHealingDamage.disabled'
      },
      restricted: true,
      default: 'owner',
   });

   game.settings.register('titan', 'reportSpendingResolve', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.reportSpendingResolve.label',
      hint: 'SETTINGS.reportSpendingResolve.hint',
      type: String,
      choices: {
         owner: 'SETTINGS.reportSpendingResolve.owner',
         gmOnly: 'SETTINGS.reportSpendingResolve.gmOnly',
         none: 'SETTINGS.reportSpendingResolve.disabled'
      },
      restricted: true,
      default: 'owner',
   });

   game.settings.register('titan', 'reportRegainingResolve', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.reportRegainingResolve.label',
      hint: 'SETTINGS.reportRegainingResolve.hint',
      type: Boolean,
      restricted: true,
      default: true,
   });

   game.settings.register('titan', 'reportResting', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.reportResting.label',
      hint: 'SETTINGS.reportResting.hint',
      type: String,
      choices: {
         owner: 'SETTINGS.reportResting.owner',
         gmOnly: 'SETTINGS.reportResting.gmOnly',
         none: 'SETTINGS.reportResting.disabled'
      },
      restricted: true,
      default: 'owner',
   });

   game.settings.register('titan', 'reportEffects', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.reportEffects.label',
      hint: 'SETTINGS.reportEffects.hint',
      type: Boolean,
      restricted: true,
      default: true,
   });

   game.settings.register('titan', 'baseStaminaMultiplier', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.baseStaminaMultiplier.label',
      hint: 'SETTINGS.baseStaminaMultiplier.hint',
      type: Number,
      restricted: true,
      default: 2,
   });

   game.settings.register('titan', 'baseResolveMultiplier', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.baseResolveMultiplier.label',
      hint: 'SETTINGS.baseResolveMultiplier.hint',
      type: Number,
      restricted: true,
      default: 0.5,
   });

   game.settings.register('titan', 'baseWoundsMultiplier', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.baseWoundsMultiplier.label',
      hint: 'SETTINGS.baseWoundsMultiplier.hint',
      type: Number,
      restricted: true,
      default: 0.5,
   });

   game.settings.register('titan', 'baseWoundsRegain', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.baseWoundsRegain.label',
      hint: 'SETTINGS.baseWoundsRegain.hint',
      type: Number,
      default: 1,
      range: {
         min: 0,
         max: 10,
         step: 1
      },
      restricted: true,
   });

   game.settings.register('titan', 'baseResolveRegain', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.baseResolveRegain.label',
      hint: 'SETTINGS.baseResolveRegain.hint',
      type: Number,
      default: 1,
      range: {
         min: 0,
         max: 10,
         step: 1
      },
      restricted: true,
   });
}