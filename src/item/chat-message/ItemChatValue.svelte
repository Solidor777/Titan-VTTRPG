<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import StatTag from "../../helpers/svelte-components/StatTag.svelte";

   // Chat context reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
</script>

<StatTag label={localize("LOCAL.value.label")} value={chatContext.system.value} />
