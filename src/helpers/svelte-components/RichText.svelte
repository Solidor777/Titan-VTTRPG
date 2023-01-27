<script>
   import { getContext } from "svelte";

   // Setup context variables
   const document = getContext("DocumentStore");

   export let text = void 0;
   $: displayText = TextEditor.enrichHTML(text, { async: false, secrets: true });
</script>

<div class="rich-text {$document.isOwner ? '' : 'not-owner'}">
   {@html displayText}
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .rich-text {
      overflow: hidden;
      text-align: left;
      margin: 0rem 0.25rem;
   }
</style>
