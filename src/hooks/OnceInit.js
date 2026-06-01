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
import TitanActiveEffect from '~/document/types/active-effect/TitanActiveEffect.js';
import TitanActiveEffectDataModel from '~/document/types/active-effect/TitanActiveEffectDataModel.js';
import ConditionDataModel from '~/document/types/active-effect/ConditionDataModel.js';
import TitanActiveEffectSheet from '~/document/types/active-effect/sheet/TitanActiveEffectSheet.js';

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

   // Unregister old sheet classes.
   foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet);
   foundry.documents.collections.Items.unregisterSheet('core', foundry.appv1.sheets.ItemSheet);

   // Install the test-only component probe harness when built for e2e. `__TITAN_PROBE__` is a Vite
   // compile-time constant (true only under `--mode e2e`); the production build sets it false so terser
   // dead-code-eliminates this branch and the dynamic import is never bundled. Fire-and-forget so
   // `onceInit` stays synchronous and CONFIG setup ordering is unaffected.
   /* global __TITAN_PROBE__ */
   if (__TITAN_PROBE__) {
      import('~/test-probe/registerProbe.js').then((module) => {
         module.default();
      });
   }
}
