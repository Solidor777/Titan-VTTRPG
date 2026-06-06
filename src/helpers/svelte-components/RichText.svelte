<script>
   import { getContext } from 'svelte';

   /**
    * @typedef {object} RichTextProps
    * @property {string} [value] - The raw HTML to display.
    */

   /** @type {RichTextProps} */
   let { value = undefined } = $props();

   /** @type {object} The nearest document bridge ('document' context — possibly an embedded one). */
   const document = getContext('document');

   /** @type {string} - The enriched HTML, resolved asynchronously. */
   let displayText = $state('');

   $effect(() => {
      /** @type {boolean} - Guards against applying a stale enrich result. */
      let cancelled = false;
      foundry.applications.ux.TextEditor.implementation
         .enrichHTML(value, { secrets: true })
         .then((html) => {
            if (!cancelled) {
               displayText = html;
            }
         });
      return () => {
         cancelled = true;
      };
   });
</script>

<div
   class={document.data?.isOwner ? 'rich-text' : 'rich-text not-owner'}>
   {@html displayText}
</div>

<style lang="scss">
   .rich-text {
      font-weight: normal;
      text-align: left;
      margin: 0 var(--titan-spacing-standard);
   }
</style>
