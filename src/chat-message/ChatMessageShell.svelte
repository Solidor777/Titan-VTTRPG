<svelte:options accessors={true} />

<script>
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import CheckChatMessageShell from "~/check/chat-message/CheckChatMessageShell.svelte";
   import WeaponChatMessageShell from "~/item/weapon/chat-message/WeaponChatMessageShell.svelte";
   import ArmorChatMessageShell from "~/item/armor/chat-message/ArmorChatMessageShell.svelte";
   import DamageReportChatMessageShell from "./DamageReportChatMessageShell.svelte";
   import HealingReportChatMessageShell from "./HealingReportChatMessageShell.svelte";
   import SpellChatMessageShell from "~/item/spell/chat-message/SpellChatMessageShell.svelte";
   import AbilityChatMesssageShell from "~/item/ability/chat-message/AbilityChatMesssageShell.svelte";

   // Context object
   export let documentStore = void 0;

   // Setup
   setContext("DocumentSheetObject", documentStore);
   const document = getContext("DocumentSheetObject");

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
         weapon: WeaponChatMessageShell,
         spell: SpellChatMessageShell,
         ability: AbilityChatMesssageShell,
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
