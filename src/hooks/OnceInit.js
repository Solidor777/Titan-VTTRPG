import TitanActor from '~/document/types/actor/TitanActor.js';
import TitanItem from '~/document/types/item/TitanItem.js';
import TitanPlayerSheet from '~/document/types/actor/types/character/types/player/PlayerSheet.js';
import TitanNPCSheet from '~/document/types/actor/types/character/types/npc/NPCSheet.js';
import TitanAbilitySheet from '~/document/types/item/types/ability/sheet/AbilitySheet.js';
import TitanArmorSheet from '~/document/types/item/types/armor/sheet/ArmorSheet.js';
import TitanCommoditySheet from '~/document/types/item/types/commodity/sheet/CommoditySheet.js';
import TitanEquipmentSheet from '~/document/types/item/types/equipment/sheet/EquipmentSheet.js';
import TitanShieldSheet from '~/document/types/item/types/shield/sheet/ShieldSheet.js';
import TitanSpellSheet from '~/document/types/item/types/spell/sheet/SpellSheet.js';
import TitanWeaponSheet from '~/document/types/item/types/weapon/sheet/WeaponSheet.js';
import TitanMacros from '~/system/Macros.js';
import PlayerDataModel from '~/document/types/actor/types/character/types/player/PlayerDataModel.js';
import NPCDataModel from '~/document/types/actor/types/character/types/npc/NPCDataModel.js';
import log from '~/helpers/utility-functions/Log.js';
import warn from '~/helpers/utility-functions/Warn.js';
import assert from '~/helpers/utility-functions/Assert.js';
import error from '~/helpers/utility-functions/Error.js';
import getTrackableAttributes from '~/system/TrackableAttributes.js';
import registerSystemSettings from '~/system/SystemSettings.js';
import registerInitiativeFormula from '~/system/Initiative.js';
import AbilityDataModel from '~/document/types/item/types/ability/AbilityDataModel.js';
import CommodityDataModel from '~/document/types/item/types/commodity/CommodityDataModel.js';
import EquipmentDataModel from '~/document/types/item/types/equipment/EquipmentDataModel.js';
import ShieldDataModel from '~/document/types/item/types/shield/ShieldDataModel.js';
import SpellDataModel from '~/document/types/item/types/spell/SpellDataModel.js';
import WeaponDataModel from '~/document/types/item/types/weapon/WeaponDataModel.js';
import localize from '~/helpers/utility-functions/Localize.js';
import TitanCombat from '~/document/types/combat/TitanCombat.js';
import SocketManager from '~/helpers/SocketManager.js';
import ArmorDataModel from '~/document/types/item/types/armor/ArmorDataModel.js';
import TitanChatMessage from '~/document/types/chat-message/ChatMessage.js';
import AttributeCheckChatMessageDataModel from '~/check/types/attribute-check/chat-message/AttributeCheckChatMessageDataModel.js';
import ResistanceCheckChatMessageDataModel from '~/check/types/resistance-check/chat-message/ResistanceCheckChatMessageDataModel.js';
import AttackCheckChatMessageDataModel from '~/check/types/attack-check/chat-message/AttackCheckChatMessageDataModel.js';
import CastingCheckChatMessageDataModel from '~/check/types/casting-check/chat-message/CastingCheckChatMessageDataModel.js';
import ItemCheckChatMessageDataModel from '~/check/types/item-check/chat-message/ItemCheckChatMessageDataModel.js';
import WeaponChatMessageDataModel from '~/document/types/item/types/weapon/chat-message/WeaponChatMessageDataModel.js';
import ArmorChatMessageDataModel from '~/document/types/item/types/armor/chat-message/ArmorChatMessageDataModel.js';
import SpellChatMessageDataModel from '~/document/types/item/types/spell/chat-message/SpellChatMessageDataModel.js';
import AbilityChatMessageDataModel from '~/document/types/item/types/ability/chat-message/AbilityChatMessageDataModel.js';
import ShieldChatMessageDataModel from '~/document/types/item/types/shield/chat-message/ShieldChatMessageDataModel.js';
import EquipmentChatMessageDataModel from '~/document/types/item/types/equipment/chat-message/EquipmentChatMessageDataModel.js';
import CommodityChatMessageDataModel from '~/document/types/item/types/commodity/chat-message/CommodityChatMessageDataModel.js';
import TitanActiveEffect from '~/document/types/active-effect/TitanActiveEffect.js';
import TitanActiveEffectDataModel from '~/document/types/active-effect/TitanActiveEffectDataModel.js';
import ConditionDataModel from '~/document/types/active-effect/ConditionDataModel.js';
import TitanActiveEffectSheet from '~/document/types/active-effect/sheet/TitanActiveEffectSheet.js';

// Sidebar tab.
import TitanEffectTrayTab from '~/sidebar/TitanEffectTrayTab.js';

/**
 * Attached to the Init Hook.
 * Sets up the Titan system once the game is initiated.
 */
export default function onceInit() {
   log('Starting Titan VTTRPG System');

   // Initialize titan namespace.
   game.titan = {
      macros: new TitanMacros(),
      assert,
      warn,
      log,
      error,
      socketManager: new SocketManager(),
   };

   // Register system settings.
   registerSystemSettings();

   // Register initiative formula.
   registerInitiativeFormula();

   // Configure Actors.
   CONFIG.Actor.documentClass = TitanActor;
   CONFIG.Actor.dataModels = {
      player: PlayerDataModel,
      npc: NPCDataModel,
   };
   CONFIG.Actor.trackableAttributes = getTrackableAttributes();

   // Configure Items.
   CONFIG.Item.documentClass = TitanItem;
   CONFIG.Item.dataModels = {
      ability: AbilityDataModel,
      armor: ArmorDataModel,
      commodity: CommodityDataModel,
      equipment: EquipmentDataModel,
      shield: ShieldDataModel,
      spell: SpellDataModel,
      weapon: WeaponDataModel,
   };

   // Configure Active Effects.
   CONFIG.ActiveEffect.documentClass = TitanActiveEffect;
   CONFIG.ActiveEffect.dataModels = {
      effect: TitanActiveEffectDataModel,
      condition: ConditionDataModel,
   };

   // Configure Chat Messages.
   CONFIG.ChatMessage.documentClass = TitanChatMessage;
   CONFIG.ChatMessage.dataModels = {
      attributeCheck: AttributeCheckChatMessageDataModel,
      resistanceCheck: ResistanceCheckChatMessageDataModel,
      attackCheck: AttackCheckChatMessageDataModel,
      castingCheck: CastingCheckChatMessageDataModel,
      itemCheck: ItemCheckChatMessageDataModel,
      weapon: WeaponChatMessageDataModel,
      armor: ArmorChatMessageDataModel,
      spell: SpellChatMessageDataModel,
      ability: AbilityChatMessageDataModel,
      shield: ShieldChatMessageDataModel,
      equipment: EquipmentChatMessageDataModel,
      commodity: CommodityChatMessageDataModel,
   };

   CONFIG.time.roundTime = 6;
   CONFIG.ActiveEffect.legacyTransferral = false;

   CONFIG.Combat.documentClass = TitanCombat;

   // Register Sheet Classes.
   foundry.documents.collections.Actors.registerSheet(
      'titan', TitanNPCSheet, {
         types: ['npc'],
         makeDefault: true,
         label: localize('defaultNpcSheet'),
      },
   );
   foundry.documents.collections.Actors.registerSheet(
      'titan', TitanPlayerSheet, {
         types: ['player'],
         makeDefault: true,
         label: localize('defaultPlayerSheet'),
      },
   );
   foundry.documents.collections.Items.registerSheet(
      'titan', TitanAbilitySheet, {
         types: ['ability'],
         makeDefault: true,
         label: localize('defaultAbilitySheet'),
      },
   );
   foundry.documents.collections.Items.registerSheet(
      'titan', TitanArmorSheet, {
         types: ['armor'],
         makeDefault: true,
         label: localize('defaultArmorSheet'),
      },
   );
   foundry.documents.collections.Items.registerSheet(
      'titan', TitanCommoditySheet, {
         types: ['commodity'],
         makeDefault: true,
         label: localize('defaultCommoditySheet'),
      },
   );
   foundry.documents.collections.Items.registerSheet(
      'titan', TitanEquipmentSheet, {
         types: ['equipment'],
         makeDefault: true,
         label: localize('defaultEquipmentSheet'),
      },
   );
   foundry.documents.collections.Items.registerSheet(
      'titan', TitanShieldSheet, {
         types: ['shield'],
         makeDefault: true,
         label: localize('defaultShieldSheet'),
      },
   );
   foundry.documents.collections.Items.registerSheet(
      'titan', TitanSpellSheet, {
         types: ['spell'],
         makeDefault: true,
         label: localize('defaultSpellSheet'),
      },
   );
   foundry.documents.collections.Items.registerSheet(
      'titan', TitanWeaponSheet, {
         types: ['weapon'],
         makeDefault: true,
         label: localize('defaultWeaponSheet'),
      },
   );

   // Register the Active Effect sheet for the 'effect' subtype.
   foundry.applications.apps.DocumentSheetConfig.registerSheet(
      foundry.documents.ActiveEffect, 'titan', TitanActiveEffectSheet, {
         types: ['effect'],
         makeDefault: true,
         label: localize('defaultEffectSheet'),
      },
   );

   // Register the TITAN Effect Tray sidebar tab (additive — do not replace the core Sidebar). The
   // init hook runs before Game#initializeUI instantiates ui[tabId] from CONFIG.ui, so mutating the
   // static Sidebar.TABS and setting CONFIG.ui.titanEffects here is sufficient for the tab to appear.
   foundry.applications.sidebar.Sidebar.TABS.titanEffects = {
      icon: 'fa-solid fa-wand-sparkles',
      tooltip: 'TYPES.SidebarTab.titanEffects',
   };
   CONFIG.ui.titanEffects = TitanEffectTrayTab;

   // Unregister old sheet classes.
   foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
   foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);
}
