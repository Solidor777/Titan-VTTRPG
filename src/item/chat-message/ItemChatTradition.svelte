<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ItemChatStat from "./ItemChatStat.svelte";

   // Chat context reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
</script>

<ItemChatStat label={localize("LOCAL.tradition.label")} value={chatContext.system.tradition} />
