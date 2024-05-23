<script>
   import localize from '~/helpers/utility-functions/Localize.js';

   export let opposedCheck = void 0;
</script>

<!--Check label-->
<div class="check-label {opposedCheck.attribute}">
   <!--Label-->
   <div class="label main">
      {localize('opposedCheck')}
   </div>

   <!--Skill & Attribute-->
   <div class="label">
      {#if opposedCheck.skill && opposedCheck.skill !== 'none'}
         {`${localize(opposedCheck.attribute)} (${localize(
            `${opposedCheck.skill}`,
         )})`}
      {:else}
         {localize(opposedCheck.attribute)}
      {/if}
   </div>
</div>

<style lang="scss">
   .check-label {
      @include flex-row;
      @include flex-group-center;
      @include attribute-colors;
      @include border;
      @include label;

      padding: var(--padding-standard);

      .label {
         @include flex-row;
         @include flex-group-center;

         &:not(:first-child) {
            @include border-left;

            margin-left: var(--padding-standard);
            padding-left: var(--padding-standard);
         }

         &.main {
            font-weight: bold;
         }
      }
   }
</style>
