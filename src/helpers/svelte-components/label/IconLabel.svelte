<script>
   import Label from '~/helpers/svelte-components/label/Label.svelte';

   /** @type {string} The text label to display for this element. */
   export let label = void 0;

   /** @type {string} The Icon to display for this element. */
   export let icon = void 0;

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<Label {tooltip}>
   <!--Icon-->
   <i class={icon}/>

   <!--Text-->
   <div class="text">
      {label}
   </div>
</Label>

<style lang="scss">
   i {
      @include margin-right-standard;
   }
</style>
