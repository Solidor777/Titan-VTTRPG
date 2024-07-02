<script>
   import {getContext} from 'svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string The raw html to display. */
   export let value = void 0;

   /** @type string Enriched HTMl to display. */
   let displayText = TextEditor.enrichHTML(value, {
      async: false,
      secrets: true,
   });

   /** @type string Calculated class for Rich Text object. */
   let textClass = $document.isOwner ?
      'rich-text' :
      'rich-text not-owner';

   // Update in response to changes.
   $: {
      // Update display text
      displayText = TextEditor.enrichHTML(value, {
         async: false,
         secrets: true,
      });

      // Update text class
      textClass = $document.isOwner ?
         'rich-text' :
         'rich-text not-owner';
   }

</script>

<div class={textClass}>
   {@html displayText}
</div>

<style lang="scss">
   .rich-text {
      font-weight: normal;
      text-align: left;
      margin: 0 var(--titan-padding-standard);
   }
</style>
