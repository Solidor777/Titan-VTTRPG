<script>
   import { getContext } from 'svelte';
   import PermanentEffectTag from '~/helpers/svelte-components/tag/effects/PermanentEffectTag.svelte';
   import TurnEndEffectTag from '~/helpers/svelte-components/tag/effects/TurnEndEffectTag.svelte';
   import ExpiredEffectTag from '~/helpers/svelte-components/tag/effects/ExpiredEffectTag.svelte';
   import InitiativeEffectTag from '~/helpers/svelte-components/tag/effects/InitiativeEffectTag.svelte';
   import CustomEffectTag from '~/helpers/svelte-components/tag/effects/CustomEffectTag.svelte';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

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
   {#if document.data.system.effects.permanent}
      {#each document.data.system.effects.permanent as effect}
         <div class="effect">
            <PermanentEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Turn Start Effects-->
   {#if document.data.system.effects.turnStart}
      {#each document.data.system.effects.turnStart as effect}
         <div class="effect">
            <TurnEndEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Turn End Effects-->
   {#if document.data.system.effects.turnEnd}
      {#each document.data.system.effects.turnEnd as effect}
         <div class="effect">
            <TurnEndEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Initiative Effects-->
   {#if document.data.system.effects.initiative}
      {#each document.data.system.effects.initiative as effect}
         <div class="effect">
            <InitiativeEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Custom Effects-->
   {#if document.data.system.effects.custom}
      {#each document.data.system.effects.custom as effect}
         <div class="effect">
            <CustomEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Expired Effects-->
   {#if document.data.system.effects.expired}
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
