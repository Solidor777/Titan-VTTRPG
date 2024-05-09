<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { DAMAGE_ICON, HEALING_ICON } from '~/system/Icons.js';

   // Spell aspect
   export let aspect = void 0;
</script>

<div class="aspect {aspect.resistanceCheck ? aspect.resistanceCheck : ''}">
   <!--Label-->
   <div class="stat label">
      <!--Icon-->
      {#if aspect.isDamage}
         <i class="{DAMAGE_ICON}"/>
      {/if}
      {#if aspect.isHealing}
         <i class="{HEALING_ICON}"/>
      {/if}

      {aspect.label}
   </div>

   <!--Initial value-->
   {#if aspect.initialValue !== undefined}
      <div class="stat">
         <!--Scaling value-->
         {#if aspect.scaling}
            {#if aspect.initialValue}
               {aspect.initialValue}
            {/if}
            {#if aspect.cost > 1}
               {`+ (${localize('extraSuccesses.short')} / ${aspect.cost})`}
            {:else}
               {`+ ${localize('extraSuccesses.short')}`}
            {/if}
         {:else}
            <!--Non scaling value-->
            {aspect.initialValue}
         {/if}
      </div>
   {/if}

   <!--Resistance Check-->
   {#if aspect.resistanceCheck && aspect.resistanceCheck !== 'none'}
      <div class="stat">
         {localize('resistedBy')}
         {localize(aspect.resistanceCheck)}
      </div>
   {/if}
</div>

<style lang="scss">
   .aspect {
      @include flex-row;
      @include flex-group-center;
      @include resistance-colors;
      @include border;
      @include label;
      padding: var(--padding-standard);
      flex-wrap: wrap;

      .stat {
         @include flex-row;
         @include flex-group-center;

         &.label {
            font-weight: bold;
         }

         &:not(:first-child) {
            @include border-left;
            margin-left: var(--padding-standard);
            padding-left: var(--padding-standard);
         }

         i {
            margin-right: var(--padding-standard);
         }
      }
   }
</style>
