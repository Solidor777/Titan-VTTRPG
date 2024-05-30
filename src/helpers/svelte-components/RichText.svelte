<script>
   import {getContext} from 'svelte';

   // Setup context variables
   const document = getContext('document');

   export let text = void 0;
   $: displayText = TextEditor.enrichHTML(text, {
      async: false,
      secrets: true,
   });
</script>

<div class="rich-text {$document.isOwner ? '' : 'not-owner'}">
   {@html displayText}
</div>

<style lang="scss">
   .rich-text {
      font-weight: normal;
      text-align: left;
      margin: 0 var(--titan-padding-standard);
   }
</style>
