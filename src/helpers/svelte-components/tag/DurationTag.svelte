<script>
   import { localize } from '~/helpers/Utility.js';
   export let type = void 0;
   export let remaining = void 0;
</script>

<div class="stat">
   <div class="label">
      {localize('duration')}
   </div>
   <div class="value">
      {localize(type)}
   </div>
   {#if type !== 'permanent'}
      <div class="value">
         {remaining}
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../../styles/mixins.scss';

   .stat {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      padding: 0.25rem;

      .label {
         font-weight: bold;
      }

      .value {
         @include border-left;
         padding-left: 0.25rem;
         margin-left: 0.25rem;
      }
   }
</style>
