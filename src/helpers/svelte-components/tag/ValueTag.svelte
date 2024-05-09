<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { CURRENCY_ICON } from '~/system/Icons.js';

   export let value = void 0;
</script>

<div class="stat">
   <i class="{CURRENCY_ICON}"/>
   <div class="label">
      {localize('value')}
   </div>
   <div class="value">
      {value}
   </div>
</div>

<style lang="scss">
   .stat {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      padding: var(--padding-standard);

      .label {
         @include border-right;
         font-weight: bold;
         padding-right: var(--padding-standard);
         margin: 0 var(--padding-standard);
      }
   }
</style>
