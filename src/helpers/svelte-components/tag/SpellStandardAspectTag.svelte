<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {
      DAMAGE_ICON,
      DECREASE_SPEED_ICON,
      HEALING_ICON,
      INCREASE_SPEED_ICON,
      RADIUS_ICON,
      RANGE_ICON,
   } from '~/system/Icons.js';

   const labelIcons = {
      damage: DAMAGE_ICON,
      healing: HEALING_ICON,
      range: RANGE_ICON,
      radius: RADIUS_ICON,
      decreaseSpeed: INCREASE_SPEED_ICON,
      increaseSpeed: DECREASE_SPEED_ICON,
   };

   // Spell aspect
   export let aspect = void 0;
</script>

<div class="aspect {aspect.resistanceCheck ? aspect.resistanceCheck : ''}">
   <!--Label-->
   <div class="stat label">
      <!--Icon-->
      {#if labelIcons[aspect.label]}
         <i class={labelIcons[aspect.label]}/>
      {/if}

      {localize(aspect.unit ?? aspect.label)}
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
            {#if typeof aspect.initialValue === 'string'}
               {localize(aspect.initialValue)}
            {:else}
               {aspect.initialValue}
            {/if}
         {/if}
      </div>
   {/if}

   <!--Options-->
   {#if aspect.allOptions}
      <!--All Options-->
      <div class="stat">
         {localize('all')}
      </div>
   {:else if aspect.option}
      {#each aspect.option as option}
         <!--Each option-->
         <div class="stat">
            {localize(option)}
         </div>
      {/each}
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
      @include tag;

      padding: var(--titan-padding-standard);
      flex-wrap: wrap;

      .stat {
         @include flex-row;
         @include flex-group-center;

         &.label {
            font-weight: bold;
         }

         &:not(:first-child) {
            @include border-left;

            margin-left: var(--titan-padding-standard);
            padding-left: var(--titan-padding-standard);
         }

         i {
            margin-right: var(--titan-padding-standard);
         }
      }
   }
</style>
