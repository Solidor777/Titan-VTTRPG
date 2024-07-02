<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {DAMAGE_ICON, HEALING_ICON} from '~/system/Icons.js';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';

   /** @type SpellCustomAspect The Spell Custom Aspect represented by this element. */
   export let aspect = void 0;
</script>

<ResistanceTag resistance={aspect.resistanceCheck ?? ''}>
   <!--Label-->
   <div class="stat label">
      <!--Damage Icon-->
      {#if aspect.isDamage}
         <i class="{DAMAGE_ICON}"/>
      {/if}

      <!--Healing Icon-->
      {#if aspect.isHealing}
         <i class="{HEALING_ICON}"/>
      {/if}

      <!--Label-->
      {aspect.label}
   </div>

   <!--Initial Value-->
   {#if aspect.initialValue !== undefined}
      <div class="stat">
         {#if aspect.scaling}
            <!--Scaling Value-->
            <!--Initial Value if it is not 0-->
            {#if aspect.initialValue}
               {aspect.initialValue}
            {/if}

            <!--The cost of the aspect-->
            {#if aspect.cost > 1}
               {`+ (${localize('extraSuccesses.short')} / ${aspect.cost})`}
            {:else}
               {`+ ${localize('extraSuccesses.short')}`}
            {/if}
         {:else}
            <!--Non Scaling Value-->
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
</ResistanceTag>

<style lang="scss">

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
</style>
