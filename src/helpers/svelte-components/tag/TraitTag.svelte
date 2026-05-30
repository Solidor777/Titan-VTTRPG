<script>
   import StatTag from './StatTag.svelte';
   import Tag from './Tag.svelte';

   /**
    * @typedef {object} TraitTagProps
    * @property {string} [label] - The trait label text.
    * @property {number|undefined} [value] - The numeric value, if applicable.
    * @property {string|undefined} [tooltip] - The tooltip text.
    */

   /** @type {TraitTagProps} */
   let { label = void 0, value = void 0, tooltip = void 0 } = $props();
</script>

{#if typeof value === 'number'}
   <StatTag {label} {value} {tooltip} />
{:else}
   <Tag {tooltip}>{label}</Tag>
{/if}
