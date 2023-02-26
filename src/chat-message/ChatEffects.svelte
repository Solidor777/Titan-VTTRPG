<script>
   import { slide } from 'svelte/transition';
   import { getContext } from 'svelte';
   import ChatEffectTagTurnStart from '~/chat-message/ChatEffectTagTurnStart.svelte';
   import ChatEffectTagPermanent from '~/chat-message/ChatEffectTagPermanent.svelte';
   import ChatEffectTagTurnEnd from '~/chat-message/ChatEffectTagTurnEnd.svelte';
   import ChatEffectTagExpired from '~/chat-message/ChatEffectTagExpired.svelte';
   import ChatConditionTag from '~/chat-message/ChatConditionTag.svelte';
   import ChatEffectTagInitiative from '~/chat-message/ChatEffectTagInitiative.svelte';
   import ChatEffectTagCustom from '~/chat-message/ChatEffectTagCustom.svelte';

   // Document reference
   const document = getContext('DocumentStore');
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
   {#if $document.flags.titan.permanentEffects}
      {#each $document.flags.titan.permanentEffects as effect}
         <div class="effect">
            <ChatEffectTagPermanent
               label={effect.label}
               img={effect.img}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Turn Start Effects-->
   {#if $document.flags.titan.turnStartEffects}
      {#each $document.flags.titan.turnStartEffects as effect}
         <div class="effect">
            <ChatEffectTagTurnStart
               label={effect.label}
               remaining={effect.remaining}
               img={effect.img}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Turn End Effects-->
   {#if $document.flags.titan.turnEndEffects}
      {#each $document.flags.titan.turnEndEffects as effect}
         <div class="effect">
            <ChatEffectTagTurnEnd
               label={effect.label}
               remaining={effect.remaining}
               img={effect.img}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}

   <!--Initiative Effects-->
   {#if $document.flags.titan.initiativeEffects}
      {#each $document.flags.titan.initiativeEffects as effect}
         <div class="effect">
            <ChatEffectTagInitiative
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
   {#if $document.flags.titan.customEffects}
      {#each $document.flags.titan.customEffects as effect}
         <div class="effect">
            <ChatEffectTagCustom
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
   {#if $document.flags.titan.expiredEffects}
      {#each $document.flags.titan.expiredEffects as effect}
         <div class="effect" out:slide|local>
            <ChatEffectTagExpired
               label={effect.label}
               img={effect.img}
               description={effect.description}
            />
         </div>
      {/each}
   {/if}
</div>

<style lang="scss">
   @import '../styles/Mixins.scss';
   .effects {
      @include flex-row;
      @include flex-group-center;
      flex-wrap: wrap;

      .effect {
         @include tag-margin;
      }
   }
</style>
