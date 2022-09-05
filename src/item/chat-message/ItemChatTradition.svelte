<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ItemChatTag from "./ItemChatTag.svelte";

   // Chat context reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
</script>

<ItemChatTag label={`${localize("LOCAL.tradition.label")}: ${chatContext.system.tradition}`} />
