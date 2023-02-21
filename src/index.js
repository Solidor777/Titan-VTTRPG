import '~/styles/Fonts.scss';
import '~/styles/Variables.scss';
import '~/styles/Mixins.scss';
import '~/styles/Global.scss';
import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store';
import { registerChatContextOptions } from '~/helpers/ChatContextOptions.js';
import { getSetting, localize } from '~/helpers/Utility';
import registerSystemSettings from '~/system/SystemSettings.js';
import registerTooltipSettings from '~/system/TooltipManager';
import registerInitiativeFormula from '~/system/Initiative';
import TitanConditions from '~/helpers/Conditions.js';
import TitanChatMessageTypes from '~/system/ChatMessageTypes.js';
import ChatMessageShell from '~/chat-message/ChatMessageShell.svelte';
import TitanActor from '~/actor/Actor.js';
import TitanItem from '~/item/Item.js';
import TitanPlayerSheet from '~/actor/types/player/PlayerSheet.js';
import TitanNPCSheet from '~/actor/types/npc/NPCSheet.js';
import TitanAbilitySheet from '~/item/types/ability/sheet/AbilitySheet.js';
import TitanArmorSheet from '~/item/types/armor/sheet/ArmorSheet.js';
import TitanCommoditySheet from '~/item/types/commodity/sheet/CommoditySheet.js';
import TitanEffectSheet from '~/item/types/effect/sheet/EffectSheet.js';
import TitanEquipmentSheet from '~/item/types/equipment/sheet/EquipmentSheet.js';
import TitanShieldSheet from '~/item/types/shield/sheet/ShieldSheet';
import TitanSpellSheet from '~/item/types/spell/sheet/SpellSheet.js';
import TitanWeaponSheet from '~/item/types/weapon/sheet/WeaponSheet.js';
import TitanTokenDocument from '~/documents/TokenDocument';

Hooks.once('init', async () => {
   console.log('TITAN | Starting Titan VTTRPG System');

   // Register system settings
   registerSystemSettings();
   registerTooltipSettings();
   registerInitiativeFormula();

   // Register Document Classes
   CONFIG.Actor.documentClass = TitanActor;
   CONFIG.Item.documentClass = TitanItem;
   CONFIG.Token.documentClass = TitanTokenDocument;

   // Register Sheet Classes
   Actors.registerSheet('titan', TitanPlayerSheet, {
      types: ['player'],
      makeDefault: true,
   });
   Actors.registerSheet('titan', TitanNPCSheet, {
      types: ['npc'],
      makeDefault: true,
   });
   Items.registerSheet('titan', TitanAbilitySheet, {
      types: ['ability'],
      makeDefault: true,
   });
   Items.registerSheet('titan', TitanArmorSheet, {
      types: ['armor'],
      makeDefault: true,
   });
   Items.registerSheet('titan', TitanCommoditySheet, {
      types: ['commodity'],
      makeDefault: true,
   });
   Items.registerSheet('titan', TitanEffectSheet, {
      types: ['effect'],
      makeDefault: true,
   });
   Items.registerSheet('titan', TitanEquipmentSheet, {
      types: ['equipment'],
      makeDefault: true,
   });
   Items.registerSheet('titan', TitanShieldSheet, {
      types: ['shield'],
      makeDefault: true,
   });
   Items.registerSheet('titan', TitanSpellSheet, {
      types: ['spell'],
      makeDefault: true,
   });
   Items.registerSheet('titan', TitanWeaponSheet, {
      types: ['weapon'],
      makeDefault: true,
   });

   return;
});

Hooks.once('setup', async () => {
   // Set up Conditions
   const conditions = TitanConditions.sort((a, b) => {
      const textA = game.i18n.localize(a.label);
      const textB = game.i18n.localize(b.label);
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
   });
   for (const condition of conditions) {
      const description = localize(`${condition.id}.desc`);
      condition.flags = {
         titan: {
            description: description,
            type: 'condition'
         },
         'visual-active-effects.data.content': description
      };
   }

   CONFIG.statusEffects = conditions;


   return;
});

Hooks.on('renderChatMessage', (message, html) => {
   // Check if this is a valid titan chat message
   const chatContext = message.getFlag('titan', 'chatContext');
   if (TitanChatMessageTypes.has(chatContext?.type)) {
      // Add the titan class
      const content = html.find('.chat-message').prevObject;
      content.addClass('titan');

      // Adder the owner class
      if (message.isOwner) {
         content.addClass('owner');
      }

      // Add the dark mode class
      if (getSetting('darkModeChatMessages') !== 'disabled') {
         content.addClass('titan-dark-mode');
      }

      // Add the svelte component
      const documentStore = new TJSDocument(message);
      message._svelteComponent = new ChatMessageShell({
         target: html[0],
         props: {
            documentStore: documentStore,
         }
      });
   }
   else if (getSetting('darkModeChatMessages') === 'all') {
      // Add the titan class
      const content = html.find('.chat-message').prevObject;
      content.addClass('titan-dark-mode');
   }

});


Hooks.on('preDeleteChatMessage', (message) => {
   // Check if this is a valid titan chat message
   const flagData = message.getFlag('titan', 'data');
   if (typeof flagData === 'object' && typeof message?._svelteComponent?.$destroy === 'function') {
      // If so, delete the svelte component
      message._svelteComponent.$destroy();
   }
});

Hooks.on('renderJournalSheet', (journalSheet, html) => {
   if (getSetting('darkModeJournals')) {
      const journal = html.find('journal-entry').prevObject;
      journal.addClass('titan-dark-mode');
   }
});

Hooks.on('renderJournalTextPageSheet', (journalSheet, html) => {
   if (getSetting('darkModeJournals')) {
      const journal = html.find('journal-entry').prevObject;
      journal.addClass('titan-dark-mode');
   }
});

Hooks.on("getChatLogEntryContext", registerChatContextOptions);

Hooks.on("updateCombat", (combat) => {
   onUpdateCombat(combat);
});

async function onUpdateCombat(combat) {
   const previousTurnCharacter = combat.combatants.get(combat.previous?.combatantId)?.actor;
   if (previousTurnCharacter && previousTurnCharacter.character) {
      await previousTurnCharacter.character.onTurnEnd();
   }

   const currentTurnCharacter = combat.combatant?.actor;
   if (currentTurnCharacter && currentTurnCharacter.character) {
      await currentTurnCharacter.character.onTurnStart();
   }
}