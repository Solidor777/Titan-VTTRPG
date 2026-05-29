<script>
   import { setContext } from 'svelte';

   /**
    * @type {{
    *   document: import('~/document/reactive/ReactiveDocument.svelte.js').default,
    *   applicationState: object,
    *   shell: import('svelte').Component
    * }}
    */
   let { document, applicationState, shell } = $props();

   // Expose the document bridge and UI state to all descendant components via context.
   // 'document' is the ReactiveDocument bridge: legacy children read `$document` (store shim),
   // converted children read `document.data` (runes).
   setContext('document', document);
   setContext('applicationState', applicationState);
</script>

{#if shell}
   {@const Shell = shell}
   <Shell />
{/if}
