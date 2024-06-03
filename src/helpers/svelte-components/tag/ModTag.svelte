<script>
   import tooltipAction from '~/helpers/svelte-actions/Tooltip.js';

   /** @type number the Base value of the stat before any modifiers are applied. */
   export let baseValue = void 0;

   /** @type number The Current value of the stat after modifiers are applied. */
   export let currentValue = void 0;

   /** @type string Tooltip to show for the tag. */
   export let tooltip = void 0;

   // Calculate the class
   let tagClass = 'tag';
   if (baseValue < currentValue) {
      tagClass += ' greater';
   }
   else if (baseValue > currentValue) {
      tagClass += ' lesser';
   }
</script>

<!--Total Value-->
<div class={tagClass} use:tooltipAction={tooltip}>
   {currentValue}
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      @include mod-colors;

      width: 100%;
      height: 100%;
   }
</style>
