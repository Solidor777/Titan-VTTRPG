<svelte:options accessors={true} />

<script>
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import DamageReportChatMessageShell from "./DamageReportChatMessageShell.svelte";
   import HealingReportChatMessageShell from "./HealingReportChatMessageShell.svelte";
   import CheckChatMessageShell from "~/check/chat-message/CheckChatMessageShell.svelte";
   import WeaponChatMessageShell from "~/item/types/weapon/chat-message/WeaponChatMessageShell.svelte";
   import ArmorChatMessageShell from "~/item/types/armor/chat-message/ArmorChatMessageShell.svelte";
   import SpellChatMessageShell from "~/item/types/spell/chat-message/SpellChatMessageShell.svelte";
   import AbilityChatMesssageShell from "~/item/types/ability/chat-message/AbilityChatMesssageShell.svelte";
   import EquipmentChatMessageShell from "~/item/types/equipment/chat-message/EquipmentChatMessageShell.svelte";
   import CommodityChatMessageShell from "~/item/types/commodity/chat-message/CommodityChatMessageShell.svelte";
   import EffectChatMessageShell from "~/item/types/effect/chat-message/EffectChatMessageShell.svelte";

   // Context object
   export let documentStore = void 0;

   // Setup
   setContext("DocumentStore", documentStore);
   const document = getContext("DocumentStore");

   // Selector for the chat message type
   function selectComponent() {
      const chatComponents = {
         attributeCheck: CheckChatMessageShell,
         skillCheck: CheckChatMessageShell,
         resistanceCheck: CheckChatMessageShell,
         attackCheck: CheckChatMessageShell,
         castingCheck: CheckChatMessageShell,
         itemCheck: CheckChatMessageShell,
         armor: ArmorChatMessageShell,
         ability: AbilityChatMesssageShell,
         commodity: CommodityChatMessageShell,
         equipment: EquipmentChatMessageShell,
         effect: EffectChatMessageShell,
         spell: SpellChatMessageShell,
         weapon: WeaponChatMessageShell,
         damageReport: DamageReportChatMessageShell,
         healingReport: HealingReportChatMessageShell,
      };
      return chatComponents[$document.flags.titan.chatContext.type];
   }
</script>

<div>
   {#if $document}
      <svelte:component this={selectComponent()} />
   {/if}
</div>
