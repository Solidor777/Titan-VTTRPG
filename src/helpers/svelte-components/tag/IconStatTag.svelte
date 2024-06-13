<script>
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type string The Label to display for this element. */
   export let label = void 0;

   /** @type {string|number} The Value of this Stat. */
   export let value = void 0;

   /** @type string The Icon to display for this Stat. */
   export let icon = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<Tag {tooltip}>
   <!--Icon-->
   <i class={icon}/>

   <!--Label-->
   <div class="label">
      {label}
   </div>

   <!--Value-->
   <div class="value">
      {value}
   </div>
</Tag>

<style lang="scss">

   .label {
      @include border-right;

      font-weight: bold;
      padding-right: var(--titan-padding-standard);
      margin: 0 var(--titan-padding-standard);
   }
</style>
