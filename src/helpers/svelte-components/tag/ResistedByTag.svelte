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
      @include label;

      padding: var(--padding-standard);

      &.reflexes {
         background: var(--reflexes-color);
      }

      &.resilience {
         background: var(--resilience-color);
      }

      &.willpower {
         background: var(--willpower-color);
      }

      .label {
         @include border-right;

         font-weight: bold;
         padding-right: var(--padding-standard);
         margin-right: var(--padding-standard);
      }
   }
</style>
