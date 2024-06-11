<script>
   import localize from '~/helpers/utility-functions/Localize.js';

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
   .stat {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include tag;

      padding: var(--titan-padding-standard);

      .label {
         font-weight: bold;
      }

      .value {
         @include border-left;

         padding-left: var(--titan-padding-standard);
         margin-left: var(--titan-padding-standard);
      }
   }
</style>
