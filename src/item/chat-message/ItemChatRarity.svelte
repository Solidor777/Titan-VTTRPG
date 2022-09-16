<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";

   // Chat context reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="tag {chatContext.system.rarity}">
   {localize(`${chatContext.system.rarity}`)}
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include rarity-colors;
      font-weight: bold;
      padding: 0.25rem;
   }
</style>
