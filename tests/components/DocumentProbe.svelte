<script>
   import { getContext } from 'svelte';

   /** @type {import('~/document/reactive/ReactiveDocument.svelte.js').default} - The reactive bridge. */
   const document = getContext('document');
</script>

<span data-testid="value">{document.data.system.value}</span>
