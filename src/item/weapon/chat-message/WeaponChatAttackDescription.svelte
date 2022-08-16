<script>
   import { getContext } from "svelte";
   const document = getContext("DocumentSheetObject");

   // Chat context reference
   const chatContext = $document.flags.titan.data.chatContext;
</script>

<div class="description">Temporary Attack Description</div>

<style lang="scss">
   @import "../../../styles/mixins.scss";
   .description {
      @include flex-row;
      @include flex-group-left;
      @include border-top;
      width: 100%;
      padding: 0.5rem;
      font-size: 0.9rem;
   }
</style>
