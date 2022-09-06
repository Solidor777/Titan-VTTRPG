<script>
   import { getContext } from "svelte";
   import CheckOvercastAspects from "./CheckOvercastAspects.svelte";
   import CheckChatDiceContainer from "./CheckChatDiceContainer.svelte";
   import CheckChatLabel from "./CheckChatLabel.svelte";
   import CheckChatResults from "./CheckChatResults.svelte";
   import CheckDamageButtons from "./CheckDamageButtons.svelte";
   import CheckHealingButton from "./CheckHealingButton.svelte";
   import AspectTags from "~/helpers/svelte-components/AspectTags.svelte";
   import CheckResistanceCheckButtons from "./CheckResistanceCheckButtons.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
   const isOwner = $document.constructor.getSpeakerActor($document.speaker).isOwner;
   let overcastAspects = chatContext.parameters.aspects
      ? chatContext.parameters.aspects.filter((aspect) => {
           return aspect.overcast;
        })
      : false;
</script>

<div class="check-chat-message">
   <div class="label">
      <CheckChatLabel />
   </div>

   {#if chatContext.parameters.aspects && chatContext.parameters.aspects.length > 0}
      <div class="info top-margin">
         <AspectTags aspects={chatContext.parameters.aspects} />
      </div>
   {/if}

   <div class="info top-margin">
      <CheckChatDiceContainer />
   </div>

   <div class="info top-margin">
      <CheckChatResults />
   </div>

   {#if isOwner && overcastAspects && overcastAspects.length > 0 && chatContext.results.extraSuccesses !== undefined}
      <div class="info top-margin">
         <CheckOvercastAspects bind:overcastAspects />
      </div>
   {/if}

   <!-- svelte-ignore missing-declaration -->
   {#if chatContext.results.damage !== undefined && game.user.isGM}
      <div class="info top-margin">
         <CheckDamageButtons />
      </div>
   {/if}

   <!-- svelte-ignore missing-declaration -->
   {#if chatContext.results.healing !== undefined && game.user.isGM}
      <div class="info top-margin">
         <CheckHealingButton />
      </div>
   {/if}

   {#if chatContext.results.reflexesCheck || chatContext.results.resilienceCheck || chatContext.results.willpowerCheck}
      <div class="info">
         <CheckResistanceCheckButtons />
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
