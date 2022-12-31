<script>
   import { getContext } from "svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
   console.log($document.isOwner);

   export let text = void 0;
</script>

<div class="rich-text {$document.isOwner ? 'owner' : ''}">{$document.isOwner}{@html text}</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .rich-text {
      @include font-size-normal;
      text-align: left;
      width: 100%;
   }
</style>
