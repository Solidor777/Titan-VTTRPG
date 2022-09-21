<script>
   import { getContext } from "svelte";
   import CheckScalingAspects from "./CheckScalingAspects.svelte";
   import CheckChatDiceContainer from "./CheckChatDiceContainer.svelte";
   import CheckChatLabel from "./CheckChatLabel.svelte";
   import CheckChatResults from "./CheckChatResults.svelte";
   import CheckChatDamageButtons from "./CheckChatDamageButtons.svelte";
   import CheckChatHealingButton from "./CheckChatHealingButton.svelte";
   import CheckChatResistanceCheckButtons from "./CheckChatResistanceCheckButtons.svelte";
   import CheckChatOpposedCheckButton from "./CheckChatOpposedCheckButton.svelte";
   import SpellAspectTags from "~/helpers/svelte-components/tag/SpellAspectTags.svelte";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
   const isOwner = $document.constructor.getSpeakerActor($document.speaker)?.isOwner;
   let scalingAspects = chatContext.parameters.aspects
      ? chatContext.parameters.aspects.filter((aspect) => {
           return aspect.scaling;
        })
      : false;
</script>

<div class="check-chat-message">
   <div class="label">
      <CheckChatLabel />
   </div>

   {#if chatContext.parameters.aspects && chatContext.parameters.aspects.length > 0}
      <div class="info top-margin">
         <SpellAspectTags aspects={chatContext.parameters.aspects} />
      </div>
   {/if}

   <div class="info top-margin">
      <CheckChatDiceContainer />
   </div>

   <div class="info top-margin">
      <CheckChatResults />
   </div>

   {#if isOwner && scalingAspects && scalingAspects.length > 0 && chatContext.results.extraSuccesses !== undefined}
      <div class="info top-margin">
         <CheckScalingAspects bind:scalingAspects />
      </div>
   {/if}

   <!-- svelte-ignore missing-declaration -->
   {#if chatContext.results.damage !== undefined && game.user.isGM}
      <div class="info top-margin">
         <CheckChatDamageButtons />
      </div>
   {/if}

   <!-- svelte-ignore missing-declaration -->
   {#if chatContext.results.healing !== undefined && game.user.isGM}
      <div class="info top-margin">
         <CheckChatHealingButton />
      </div>
   {/if}

   {#if chatContext.results.succeeded && chatContext.parameters.opposedCheck}
      <div class="info top-margin">
         <CheckChatOpposedCheckButton />
      </div>
   {/if}

   {#if chatContext.results.reflexesCheck || chatContext.results.resilienceCheck || chatContext.results.willpowerCheck}
      <div class="info top-margin">
         <CheckChatResistanceCheckButtons />
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";
   @import "../../styles/Variables.scss";

   .check-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .info {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
      }

      .top-margin {
         margin-top: 0.5rem;
      }
   }
</style>
