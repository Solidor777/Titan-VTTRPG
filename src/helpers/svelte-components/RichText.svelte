<script>
   import { getContext } from 'svelte';

   /**
    * @typedef {object} RichTextProps
    * @property {string} [value] - The raw HTML to display.
    */

   /** @type {RichTextProps} */
   let { value = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Enriched HTML to display. */
   let displayText = $derived(TextEditor.enrichHTML(value, {
      async: false,
      secrets: true,
   }));
</script>

<div
   class={document.data.isOwner ? 'rich-text' : 'rich-text not-owner'}>
   {@html displayText}
</div>

<style lang="scss">
   .rich-text {
      font-weight: normal;
      text-align: left;
      margin: 0 var(--titan-spacing-standard);
   }
</style>
