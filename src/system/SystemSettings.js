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
         showButton: 'SETTINGS.autoRegainResolve.showButton',
         enabled: 'SETTINGS.autoRegainResolve.enabled',
         disabled: 'SETTINGS.autoRegainResolve.disabled'
      },
      restricted: true,
      default: 'showButton',
      requiresReload: true,
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

   game.settings.register('titan', 'autoApplyFastHealing', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoApplyFastHealing.label',
      hint: 'SETTINGS.autoApplyFastHealing.hint',
      type: String,
      choices: {
         showButton: 'SETTINGS.autoApplyFastHealing.showButton',
         enabled: 'SETTINGS.autoApplyFastHealing.enabled',
         disabled: 'SETTINGS.autoApplyFastHealing.disabled'
      },
      restricted: true,
      default: 'showButton',
      requiresReload: true,
   });

   game.settings.register('titan', 'autoApplyPersistentDamage', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.autoApplyPersistentDamage.label',
      hint: 'SETTINGS.autoApplyPersistentDamage.hint',
      type: String,
      choices: {
         showButton: 'SETTINGS.autoApplyPersistentDamage.showButton',
         enabled: 'SETTINGS.autoApplyPersistentDamage.enabled',
         disabled: 'SETTINGS.autoApplyPersistentDamage.disabled'
      },
      restricted: true,
      default: 'showButton',
      requiresReload: true,
   });

   game.settings.register('titan', 'baseWoundRegain', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.baseWoundRegain.label',
      hint: 'SETTINGS.baseWoundRegain.hint',
      type: Number,
      default: 1,
      range: {
         min: 0,
         max: 10,
         step: 1
      },
      restricted: true,
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
         showButton: 'SETTINGS.autoRemoveExpiredEffects.showButton',
         enabled: 'SETTINGS.autoRemoveExpiredEffects.enabled',
         disabled: 'SETTINGS.autoRemoveExpiredEffects.disabled'
      },
      restricted: true,
      default: 'showButton',
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

   game.settings.register('titan', 'reportRegainingResolve', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.reportRegainingResolve.label',
      hint: 'SETTINGS.reportRegainingResolve.hint',
      type: Boolean,
      restricted: true,
      default: true,
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

   game.settings.register('titan', 'staminaMultiplier', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.staminaMultiplier.label',
      hint: 'SETTINGS.staminaMultiplier.hint',
      type: Number,
      restricted: true,
      default: 2,
   });

   game.settings.register('titan', 'resolveMultiplier', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.resolveMultiplier.label',
      hint: 'SETTINGS.resolveMultiplier.hint',
      type: Number,
      restricted: true,
      default: 0.5,
   });

   game.settings.register('titan', 'woundsMultiplier', {
      config: true,
      scope: 'world',
      name: 'SETTINGS.woundsMultiplier.label',
      hint: 'SETTINGS.woundsMultiplier.hint',
      type: Number,
      restricted: true,
      default: 0.5,
   });
}