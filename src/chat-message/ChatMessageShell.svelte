<svelte:options accessors={true} />

<script>
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import CheckChatMessageShell from "~/check/chat-message/CheckChatMessageShell.svelte";
   import WeaponChatMessageShell from "~/item/weapon/chat-message/WeaponChatMessageShell.svelte";
   import DamageReportChatMessageShell from "./DamageReportChatMessageShell.svelte";
   import HealingReportChatMessageShell from "./HealingReportChatMessageShell.svelte";

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
         weapon: WeaponChatMessageShell,
         damageReport: DamageReportChatMessageShell,
         healingReport: HealingReportChatMessageShell,
      };
      return chatComponents[$document.flags.titan.data.chatContext.type];
   }
</script>

<div>
   <svelte:component this={selectComponent()} />
</div>
