<script>
   import { getContext } from 'svelte';
   import PermanentEffectTag from '~/helpers/svelte-components/tag/effects/PermanentEffectTag.svelte';
   import TurnEndEffectTag from '~/helpers/svelte-components/tag/effects/TurnEndEffectTag.svelte';
   import TurnStartEffectTag from '~/helpers/svelte-components/tag/effects/TurnStartEffectTag.svelte';
   import ExpiredEffectTag from '~/helpers/svelte-components/tag/effects/ExpiredEffectTag.svelte';
   import InitiativeEffectTag from '~/helpers/svelte-components/tag/effects/InitiativeEffectTag.svelte';
   import CustomEffectTag from '~/helpers/svelte-components/tag/effects/CustomEffectTag.svelte';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';
   import {
      DURATION_CUSTOM,
      DURATION_INITIATIVE,
      DURATION_PERMANENT,
      DURATION_TURN_END,
      DURATION_TURN_START,
   } from '~/system/DurationTypes.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="effects">
   {#if document.data.system.conditions?.length}
      {#each document.data.system.conditions as effect}
         <div class="effect">
            <EffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Permanent Effects-->
   {#if document.data.system.effects?.[DURATION_PERMANENT]}
      {#each document.data.system.effects[DURATION_PERMANENT] as effect}
         <div class="effect">
            <PermanentEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Turn Start Effects-->
   {#if document.data.system.effects?.[DURATION_TURN_START]}
      {#each document.data.system.effects[DURATION_TURN_START] as effect}
         <div class="effect">
            <TurnStartEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Turn End Effects-->
   {#if document.data.system.effects?.[DURATION_TURN_END]}
      {#each document.data.system.effects[DURATION_TURN_END] as effect}
         <div class="effect">
            <TurnEndEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Initiative Effects-->
   {#if document.data.system.effects?.[DURATION_INITIATIVE]}
      {#each document.data.system.effects[DURATION_INITIATIVE] as effect}
         <div class="effect">
            <InitiativeEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Custom Effects-->
   {#if document.data.system.effects?.[DURATION_CUSTOM]}
      {#each document.data.system.effects[DURATION_CUSTOM] as effect}
         <div class="effect">
            <CustomEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Expired Effects-->
   {#if document.data.system.effects?.expired}
      {#each document.data.system.effects.expired as effect}
         <div class="effect">
            <ExpiredEffectTag {effect}/>
         </div>
      {/each}
   {/if}
</div>

<style lang="scss">
   .effects {
      @include flex-row;
      @include flex-group-center;

      flex-wrap: wrap;

      .effect {
         @include tag-container-child-margin;
      }
   }
</style>
