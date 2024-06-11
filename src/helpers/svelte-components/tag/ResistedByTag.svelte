<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   export let resistance = void 0;
</script>

<div class="tag {resistance}">
   <div class="label">
      {localize('resistedBy')}
   </div>
   <div class="value">
      {localize(resistance)}
   </div>
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include tag;

      padding: var(--titan-padding-standard);

      &.reflexes {
         background: var(--titan-reflexes-color);
      }

      &.resilience {
         background: var(--titan-resilience-color);
      }

      &.willpower {
         background: var(--titan-willpower-color);
      }

      .label {
         @include border-right;

         font-weight: bold;
         padding-right: var(--titan-padding-standard);
         margin-right: var(--titan-padding-standard);
      }
   }
</style>
