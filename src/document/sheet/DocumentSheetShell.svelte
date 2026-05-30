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
   // 'document' is the ReactiveDocument bridge: all children read `document.data` (runes accessor).
   // These captures are intentional: both values are stable for the component's lifetime.
   // svelte-ignore state_referenced_locally
   setContext('document', document);
   // svelte-ignore state_referenced_locally
   setContext('applicationState', applicationState);
</script>

{#if shell}
   {@const Shell = shell}
   <Shell />
{/if}
