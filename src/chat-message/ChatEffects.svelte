<script>
   import { slide } from 'svelte/transition';
   import { getContext } from 'svelte';
   import ChatEffectTagTurnStart from '~/chat-message/ChatEffectTagTurnStart.svelte';
   import ChatEffectTagPermanent from '~/chat-message/ChatEffectTagPermanent.svelte';
   import ChatEffectTagTurnEnd from '~/chat-message/ChatEffectTagTurnEnd.svelte';
   import ChatEffectTagExpired from '~/chat-message/ChatEffectTagExpired.svelte';
   import ChatConditionTag from '~/chat-message/ChatConditionTag.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="effects">
   {#if chatContext.conditions}
      {#each chatContext.conditions as effect}
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
   {#if chatContext.permanentEffects}
      {#each chatContext.permanentEffects as effect}
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
   {#if chatContext.turnStartEffects}
      {#each chatContext.turnStartEffects as effect}
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
   {#if chatContext.turnEndEffects}
      {#each chatContext.turnEndEffects as effect}
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

   <!--Expired Effects-->
   {#if chatContext.expiredEffects}
      {#each chatContext.expiredEffects as effect}
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
