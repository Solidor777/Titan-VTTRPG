<script>
   import { slide } from 'svelte/transition';
   import { getContext } from 'svelte';
   import ChatEffectTagTurnStart from '~/chat-message/ChatEffectTagTurnStart.svelte';
   import ChatEffectTagPermanent from '~/chat-message/ChatEffectTagPermanent.svelte';
   import ChatEffectTagTurnEnd from '~/chat-message/ChatEffectTagTurnEnd.svelte';
   import ChatEffectTagExpired from '~/chat-message/ChatEffectTagExpired.svelte';
   import ChatConditionTag from '~/chat-message/ChatConditionTag.svelte';
   import ChatEffectTagInitiative from '~/chat-message/ChatEffectTagInitiative.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   console.log($document.flags.titan.chatContext);
</script>

<div class="effects">
   {#if $document.flags.titan.chatContext.conditions}
      {#each $document.flags.titan.chatContext.conditions as effect}
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
   {#if $document.flags.titan.chatContext.permanentEffects}
      {#each $document.flags.titan.chatContext.permanentEffects as effect}
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
   {#if $document.flags.titan.chatContext.turnStartEffects}
      {#each $document.flags.titan.chatContext.turnStartEffects as effect}
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
   {#if $document.flags.titan.chatContext.turnEndEffects}
      {#each $document.flags.titan.chatContext.turnEndEffects as effect}
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
   {#if $document.flags.titan.chatContext.initiativeEffects}
      {#each $document.flags.titan.chatContext.initiativeEffects as effect}
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

   <!--Expired Effects-->
   {#if $document.flags.titan.chatContext.expiredEffects}
      {#each $document.flags.titan.chatContext.expiredEffects as effect}
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
