import './styles/Fonts.scss';
import './styles/Variables.scss';
import './styles/Mixins.scss';
import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store';
import TitanConstants from './system/Constants.js';
import TitanChatMessageTypes from './system/ChatMessageTypes.js';
import registerSystemSettings from './system/RegisterSystemSettings.js';
import TitanActor from './actor/Actor.js';
import TitanItem from './item/Item.js';
import TitanPlayerSheet from './actor/types/player/PlayerSheet.js';
import TitanAbilitySheet from './item/types/ability/sheet/AbilitySheet.js';
import TitanArmorSheet from './item/types/armor/sheet/ArmorSheet.js';
import TitanEffectSheet from './item/types/effect/sheet/EffectSheet.js';
import TitanSpellSheet from './item/types/spell/sheet/SpellSheet.js';
import TitanWeaponSheet from './item/types/weapon/sheet/WeaponSheet.js';
import ChatMessageShell from './chat-message/ChatMessageShell.svelte';

Hooks.once('init', async () => {
   console.log('TITAN | Starting Titan VTTRPG System');
   console.log(CONFIG.statusEffects);

   // Add custom constants for easy access
   CONFIG.TITAN = {
      constants: TitanConstants,
   };

   // Register Document Classes
   CONFIG.Actor.documentClass = TitanActor;
   CONFIG.Item.documentClass = TitanItem;

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
   Items.registerSheet('titan', TitanEffectSheet, {
      types: ['effect'],
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

   // Register system settings
   registerSystemSettings();

   return;
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