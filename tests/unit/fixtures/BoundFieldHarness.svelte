<script>
   /**
    * @typedef {object} BoundFieldHarnessProps
    * @property {object} component - The Svelte component under test; it must expose a bindable `prop`.
    * @property {string} prop - The name of the bindable prop to bind to the missing field.
    */

   /** @type {BoundFieldHarnessProps} */
   const { component: Component, prop } = $props();

   /** @type {object} A document-like object whose `field` is missing, so the bound value is undefined. */
   const fields = $state({});
</script>

{#if prop === 'value'}
   <Component bind:value={fields.field}/>
{:else}
   <Component bind:expanded={fields.field}/>
{/if}

<output data-testid="field">{String(fields.field)}</output>
