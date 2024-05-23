<script>
   import { getContext } from 'svelte';
   import ChatTurnStartEffectTag from '~/helpers/svelte-components/tag/effects/TurnStartEffectTag.svelte';
   import ChatPermanentEffectTag from '~/helpers/svelte-components/tag/effects/PermanentEffectTag.svelte';
   import ChatTurnEndEffectTag from '~/helpers/svelte-components/tag/effects/TurnEndEffectTag.svelte';
   import ChatExpiredEffectTag from '~/helpers/svelte-components/tag/effects/ExpiredEffectTag.svelte';
   import ChatConditionTag from '~/helpers/svelte-components/tag/ConditionTag.svelte';
   import ChatInitiativeEffectTag from '~/helpers/svelte-components/tag/effects/InitiativeEffectTag.svelte';
   import ChatCustomEffectTag from '~/helpers/svelte-components/tag/effects/CustomEffectTag.svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');
</script>

<div class="effects">
   {#if $document.flags.titan.conditions}
      {#each $document.flags.titan.conditions as effect}
         <div class="effect">
            <ChatConditionTag
               label={effect.label}
               img={effect.img}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Permanent Effects-->
   {#if $document.flags.titan.effects.permanent}
      {#each $document.flags.titan.effects.permanent as effect}
         <div class="effect">
            <ChatPermanentEffectTag
               label={effect.label}
               img={effect.img}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Turn Start Effects-->
   {#if $document.flags.titan.effects.turnStart}
      {#each $document.flags.titan.effects.turnStart as effect}
         <div class="effect">
            <ChatTurnStartEffectTag
               label={effect.label}
               remaining={effect.remaining}
               img={effect.img}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Turn End Effects-->
   {#if $document.flags.titan.effects.turnEnd}
      {#each $document.flags.titan.effects.turnEnd as effect}
         <div class="effect">
            <ChatTurnEndEffectTag
               label={effect.label}
               remaining={effect.remaining}
               img={effect.img}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Initiative Effects-->
   {#if $document.flags.titan.effects.initiative}
      {#each $document.flags.titan.effects.initiative as effect}
         <div class="effect">
            <ChatInitiativeEffectTag
               label={effect.label}
               remaining={effect.remaining}
               img={effect.img}
               initiative={effect.initiative}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Custom Effects-->
   {#if $document.flags.titan.effects.custom}
      {#each $document.flags.titan.effects.custom as effect}
         <div class="effect">
            <ChatCustomEffectTag
               label={effect.label}
               remaining={effect.remaining}
               img={effect.img}
               custom={effect.custom}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Expired Effects-->
   {#if $document.flags.titan.effects.expired}
      {#each $document.flags.titan.effects.expired as effect}
         <div class="effect">
            <ChatExpiredEffectTag
               label={effect.label}
               img={effect.img}
               description={effect.description}
            />
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
