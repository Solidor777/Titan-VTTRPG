<script>
   import {getContext} from 'svelte';
   import PermanentEffectTag from '~/helpers/svelte-components/tag/effects/PermanentEffectTag.svelte';
   import TurnEndEffectTag from '~/helpers/svelte-components/tag/effects/TurnEndEffectTag.svelte';
   import ExpiredEffectTag from '~/helpers/svelte-components/tag/effects/ExpiredEffectTag.svelte';
   import InitiativeEffectTag from '~/helpers/svelte-components/tag/effects/InitiativeEffectTag.svelte';
   import CustomEffectTag from '~/helpers/svelte-components/tag/effects/CustomEffectTag.svelte';
   import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="effects">
   {#if $document.flags.titan.conditions}
      {#each $document.flags.titan.conditions as effect}
         <div class="effect">
            <EffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Permanent Effects-->
   {#if $document.flags.titan.effects.permanent}
      {#each $document.flags.titan.effects.permanent as effect}
         <div class="effect">
            <PermanentEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Turn Start Effects-->
   {#if $document.flags.titan.effects.turnStart}
      {#each $document.flags.titan.effects.turnStart as effect}
         <div class="effect">
            <TurnEndEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Turn End Effects-->
   {#if $document.flags.titan.effects.turnEnd}
      {#each $document.flags.titan.effects.turnEnd as effect}
         <div class="effect">
            <TurnEndEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Initiative Effects-->
   {#if $document.flags.titan.effects.initiative}
      {#each $document.flags.titan.effects.initiative as effect}
         <div class="effect">
            <InitiativeEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Custom Effects-->
   {#if $document.flags.titan.effects.custom}
      {#each $document.flags.titan.effects.custom as effect}
         <div class="effect">
            <CustomEffectTag {effect}/>
         </div>
      {/each}
   {/if}

   <!--Expired Effects-->
   {#if $document.flags.titan.effects.expired}
      {#each $document.flags.titan.effects.expired as effect}
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
         @include tag-margin;
      }
   }
</style>
