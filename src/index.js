import '~/styles/Fonts.scss';
import '~/styles/Variables.scss';
import '~/styles/Mixins.scss';
import '~/styles/Global.scss';
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
import TitanMacros from '~/system/Macros';
import registerSystemSettings from '~/system/SystemSettings.js';
import registerInitiativeFormula from '~/system/Initiative.js';
import registerChatContextOptions from '~/system/ChatContextOptions.js';
import registerItemContextOptions from '~/system/ItemContextOptions.js';
import registerActorContextOptions from '~/system/ActorContextOptions.js';
import setupConditions from '~/system/Conditions';
import onUpdateCombat from '~/system/Combat';
import onRenderJournalSheet from '~/system/Journal.js';
import onHotbarDrop from '~/system/Hotbar';
import { onRenderChatMessage, onPreDeleteChatMessage } from '~/system/ChatMessage';


Hooks.once('init', async () => {
   console.log('TITAN | Starting Titan VTTRPG System');

   // Register system settings
   registerSystemSettings();
   registerInitiativeFormula();

   // Register Document Classes
   CONFIG.Actor.documentClass = TitanActor;
   CONFIG.Item.documentClass = TitanItem;
   CONFIG.time.roundTime = 6;

   // Initialize titan specific game settings
   game.titan = {};
   game.titan.macros = new TitanMacros();

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

Hooks.once('setup', setupConditions);

Hooks.once('ready', () => {
   Hooks.on('hotbarDrop', (bar, data, slot) => {
      return onHotbarDrop(data, slot);
   });

   return;
});

Hooks.on('renderChatMessage', onRenderChatMessage);

Hooks.on('preDeleteChatMessage', onPreDeleteChatMessage);

Hooks.on('renderJournalSheet', onRenderJournalSheet);

Hooks.on('renderJournalTextPageSheet', onRenderJournalSheet);

Hooks.on("getChatLogEntryContext", registerChatContextOptions);

Hooks.on('getItemDirectoryEntryContext', registerItemContextOptions);

Hooks.on('getActorDirectoryEntryContext', registerActorContextOptions);

Hooks.on("updateCombat", onUpdateCombat);
