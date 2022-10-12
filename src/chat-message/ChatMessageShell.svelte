<svelte:options accessors={true} />

<script>
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import DamageReportChatMessageShell from "./reports/DamageReportChatMessageShell.svelte";
   import HealingReportChatMessageShell from "./reports/HealingReportChatMessageShell.svelte";
   import WeaponChatMessageShell from "~/item/types/weapon/chat-message/WeaponChatMessageShell.svelte";
   import ArmorChatMessageShell from "~/item/types/armor/chat-message/ArmorChatMessageShell.svelte";
   import SpellChatMessageShell from "~/item/types/spell/chat-message/SpellChatMessageShell.svelte";
   import AbilityChatMesssageShell from "~/item/types/ability/chat-message/AbilityChatMesssageShell.svelte";
   import EquipmentChatMessageShell from "~/item/types/equipment/chat-message/EquipmentChatMessageShell.svelte";
   import CommodityChatMessageShell from "~/item/types/commodity/chat-message/CommodityChatMessageShell.svelte";
   import EffectChatMessageShell from "~/item/types/effect/chat-message/EffectChatMessageShell.svelte";
   import ShieldChatMessageShell from "~/item/types/shield/chat-message/ShieldChatMessageShell.svelte";
   import AttributeCheckChatMessageShell from "~/check/types/attribute-check/AttributeCheckChatMessageShell.svelte";
   import ResistanceCheckChatMessageShell from "~/check/types/resistance-check/ResistanceCheckChatMessageShell.svelte";
   import ItemCheckChatMessageShell from "~/check/types/item-check/ItemCheckChatMessageShell.svelte";
   import CastingCheckChatMessageShell from "~/check/types/casting-check/CastingCheckChatMessageShell.svelte";
   import AttackCheckChatMessageShell from "~/check/types/attack-check/AttackCheckChatMessageShell.svelte";
   import RemoveTempEffectsReportChatMessageShell from "./reports/RemoveTempEffectsReportChatMessageShell.svelte";
   import BreatherReportChatMessageShell from "./reports/BreatherReportChatMessageShell.svelte";
   import RestReportChatMessageShell from "./reports/RestReportChatMessageShell.svelte";
   import ResolveRegainReportChatMessageShell from "./reports/ResolveRegainReportChatMessageShell.svelte";

   // Context object
   export let documentStore = void 0;

   // Setup
   setContext("DocumentStore", documentStore);
   const document = getContext("DocumentStore");

   // Selector for the chat message type
   function selectComponent() {
      const chatComponents = {
         attributeCheck: AttributeCheckChatMessageShell,
         resistanceCheck: ResistanceCheckChatMessageShell,
         attackCheck: AttackCheckChatMessageShell,
         castingCheck: CastingCheckChatMessageShell,
         itemCheck: ItemCheckChatMessageShell,
         armor: ArmorChatMessageShell,
         ability: AbilityChatMesssageShell,
         commodity: CommodityChatMessageShell,
         equipment: EquipmentChatMessageShell,
         effect: EffectChatMessageShell,
         shield: ShieldChatMessageShell,
         spell: SpellChatMessageShell,
         weapon: WeaponChatMessageShell,
         damageReport: DamageReportChatMessageShell,
         healingReport: HealingReportChatMessageShell,
         removeTempEffectsReport: RemoveTempEffectsReportChatMessageShell,
         breatherReport: BreatherReportChatMessageShell,
         restReport: RestReportChatMessageShell,
         resolveRegainReport: ResolveRegainReportChatMessageShell,
      };
      return chatComponents[$document.flags.titan.chatContext.type];
   }
</script>

<div>
   {#if $document}
      <svelte:component this={selectComponent()} />
   {/if}
</div>
