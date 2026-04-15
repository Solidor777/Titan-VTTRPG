<script>
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} The raw html to display. */
   export let value = void 0;

   /** @type {string} Enriched HTML to display. */
   let displayText = TextEditor.enrichHTML(value, {
      async: false,
      secrets: true,
   });

   // Update display text in response to changes.
   $: {
      displayText = TextEditor.enrichHTML(value, {
         async: false,
         secrets: true,
      });
   }

</script>

<div
   class={$document.isOwner ? 'rich-text' : 'rich-text not-owner'}>
   {@html displayText}
</div>

<style lang="scss">
   .rich-text {
      font-weight: normal;
      text-align: left;
      margin: 0 var(--titan-spacing-standard);
   }
</style>
