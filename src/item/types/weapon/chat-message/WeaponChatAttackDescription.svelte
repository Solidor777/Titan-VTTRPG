<script>
   import { getContext } from "svelte";
   const document = getContext("DocumentStore");

   // Chat context reference
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="description">Temporary Attack Notes</div>

<style lang="scss">
   @import "../../../../styles/mixins.scss";
   .description {
      @include flex-row;
      @include flex-group-left;
      padding: 0 0.5rem 0 0.5rem;
      font-size: 0.9rem;
      width: 100%;
   }
</style>
