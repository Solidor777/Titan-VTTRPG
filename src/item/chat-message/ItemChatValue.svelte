<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import StatTag from "../../helpers/svelte-components/StatTag.svelte";

   // Chat context reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<StatTag label={localize("value")} value={chatContext.system.value} />
