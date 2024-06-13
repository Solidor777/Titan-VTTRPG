<script>
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type string The Label to display for this element. */
   export let label = void 0;

   /** @type string The Icon to display for this Stat. */
   export let icon = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<Tag {tooltip}>
   <i class={icon}/>
   <div class="label">
      {label}
   </div>
</Tag>
<div class="stat">

</div>

<style lang="scss">
   .label {
      font-weight: bold;
      margin-left: var(--titan-padding-standard);
   }
</style>
