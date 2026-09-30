<script>
   import { getContext } from 'svelte';

   /**
    * @typedef {object} RichTextProps
    * @property {string} [value] - The HTML to display; it is cleaned, then enriched.
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
      // Cleaned before enrichment: enrichHTML assigns its input to a live element's innerHTML, where an event-handler
      // attribute fires, and the value can be text a user wrote (a report's rules-element message).
      foundry.applications.ux.TextEditor.implementation
         .enrichHTML(value ? foundry.utils.cleanHTML(value) : '', { secrets: true })
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
