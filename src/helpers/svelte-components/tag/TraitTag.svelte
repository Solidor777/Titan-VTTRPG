<script>
   import StatTag from './StatTag.svelte';
   import Tag from './Tag.svelte';

   /** @type {string} The trait label text. */
   export let label = void 0;

   /** @type {number|undefined} The numeric value, if applicable. */
   export let value = void 0;

   /** @type {string|undefined} The tooltip text. */
   export let tooltip = void 0;
</script>

{#if typeof value === 'number'}
   <StatTag {label} {value} {tooltip} />
{:else}
   <Tag {tooltip}>{label}</Tag>
{/if}
