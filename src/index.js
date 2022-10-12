import './styles/Fonts.scss';
import './styles/Variables.scss';
import './styles/Mixins.scss';
import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store';
import { registerChatContextOptions } from './helpers/ChatContextOptions.js';
import registerSystemSettings from './system/SystemSettings.js';
import registerTooltipSettings from './system/TooltipManager';
import registerInitiativeFormula from './system/Initiative';
import TitanStatusEffects from './helpers/StatusEffects.js';
import TitanChatMessageTypes from './system/ChatMessageTypes.js';
import ChatMessageShell from './chat-message/ChatMessageShell.svelte';
import TitanActor from './actor/Actor.js';
import TitanItem from './item/Item.js';
import TitanPlayerSheet from './actor/types/player/PlayerSheet.js';
import TitanAbilitySheet from './item/types/ability/sheet/AbilitySheet.js';
import TitanArmorSheet from './item/types/armor/sheet/ArmorSheet.js';
import TitanCommoditySheet from './item/types/commodity/sheet/CommoditySheet.js';
import TitanEffectSheet from './item/types/effect/sheet/EffectSheet.js';
import TitanEquipmentSheet from './item/types/equipment/sheet/EquipmentSheet.js';
import TitanShieldSheet from './item/types/shield/sheet/ShieldSheet';
import TitanSpellSheet from './item/types/spell/sheet/SpellSheet.js';
import TitanWeaponSheet from './item/types/weapon/sheet/WeaponSheet.js';
import TitanTokenDocument from './documents/TokenDocument';
import regainResolve from './system/RegainResolve';

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
   // Set up status effects
   CONFIG.statusEffects = TitanStatusEffects.sort((a, b) => {
      const textA = game.i18n.localize(a.label);
      const textB = game.i18n.localize(b.label);
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
   });
});

Hooks.on('renderChatMessage', (message, html) => {
   // Check if this is a valid titan chat message
   const chatContext = message.getFlag('titan', 'chatContext');

   if (TitanChatMessageTypes.has(chatContext?.type)) {
      // If so, create the chat message shell and display the message
      const documentStore = new TJSDocument(message);
      message._svelteComponent = new ChatMessageShell({
         target: html[0],
         props: {
            documentStore: documentStore,
         }
      });
   }
});

Hooks.on('preDeleteChatMessage', (message) => {
   // Check if this is a valid titan chat message
   const flagData = message.getFlag('titan', 'data');
   if (typeof flagData === 'object' && typeof message?._svelteComponent?.$destroy === 'function') {
      // If so, delete the message shell
      message._svelteComponent.$destroy();
   }
});

Hooks.on("getChatLogEntryContext", registerChatContextOptions);

Hooks.on("updateCombat", (combat) => {
   if (game.settings.get('titan', 'autoIncreaseResolve')) {
      regainResolve(combat.combatant.actor);
   }
});