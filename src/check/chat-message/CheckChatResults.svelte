<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import CheckChatResetExpertiseButton from './CheckChatResetExpertiseButton.svelte';

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="results">
   <!--Successes-->
   <div class="stat">
      <div class="border-right">
         {`${localize('dc')} ${$document.flags.titan.parameters.difficulty}:${
            $document.flags.titan.parameters.complexity
         }`}
      </div>
      <div>
         {`${$document.flags.titan.results.successes} ${localize('successes')}`}
      </div>
   </div>

   <!--Succeeded-->
   {#if $document.flags.titan.results.succeeded}
      <div class="result succeeded">
         {localize('succeeded')}
      </div>

      <!--Extra Successes-->
      {#if $document.flags.titan.results.extraSuccesses !== undefined}
         {#if $document.flags.titan.results.extraSuccessesRemaining !== undefined}
            <div class="stat">
               {localize('extraSuccesses')}: {$document.flags.titan.results
                  .extraSuccessesRemaining}/{$document.flags.titan.results
                  .extraSuccesses}
            </div>
         {:else if $document.flags.titan.results.extraSuccesses > 0}
            <div class="stat">
               {localize('extraSuccesses')}: {$document.flags.titan.results
                  .extraSuccesses}
            </div>
         {/if}
      {/if}
   {:else if $document.flags.titan.parameters.complexity > 0}
      <!--Failed-->
      <div class="result failed">
         {localize('failed')}
      </div>
   {/if}

   <!--Expertise Remaining-->
   {#if $document.flags.titan.parameters.totalExpertise}
      <div class="stat">
         <i class="fas fa-graduation-cap" />
         {localize('expertiseRemaining')}:
         {$document.flags.titan.results.expertiseRemaining}

         <!--Reset Button-->
         {#if $document.constructor.getSpeakerActor($document.speaker)?.isOwner}
            <div class="button">
               <CheckChatResetExpertiseButton />
            </div>
         {/if}
      </div>
   {/if}

   <!--Damage-->
   {#if $document.flags.titan.results.succeeded}
      {#if $document.flags.titan.results.damage > 0}
         <div class="stat">
            <i class="fas fa-burst" />
            {localize('damage')}:
            {$document.flags.titan.results.damage}
         </div>
      {/if}

      <!--Healing-->
      {#if $document.flags.titan.results.healing > 0}
         <div class="stat">
            <i class="fas fa-heart" />
            {localize('healing')}:
            {$document.flags.titan.results.healing}
         </div>
      {/if}
   {/if}

   <!--Rerolled failures-->
   {#if $document.flags.titan.failuresReRolled}
      <div class="stat">
         <i class="fas fa-dice" />
         {localize('failuresReRolled')}
      </div>
   {/if}

   <!--Training Doubled-->
   {#if $document.flags.titan.parameters.doubleTraining && $document.flags.titan.parameters.totalTrainingDice > 0}
      <div class="stat">
         <i class="fas fa-dumbbell" />
         {localize('trainingDoubled')}
      </div>
   {/if}

   <!--Expertise Doubled-->
   {#if $document.flags.titan.parameters.doubleExpertise && $document.flags.titan.parameters.totalExpertise > 0}
      <div class="stat">
         <i class="fas fa-graduation-cap" />
         {localize('expertiseDoubled')}
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .results {
      @include border;
      @include flex-column;
      @include flex-group-center;
      @include label;
      @include font-size-normal;
      font-weight: bold;
      width: 100%;
      padding: 0.5rem;

      .result {
         @include flex-row;
         @include flex-group-center;
         @include font-size-large;
         width: 100%;
         font-weight: bold;
         &.succeeded {
            color: var(--succeeded-color);
         }

         &.failed {
            color: var(--failed-color);
         }
      }

      .stat {
         @include flex-row;
         @include flex-group-center;
         &:not(:first-child) {
            margin-top: 0.25rem;
         }

         i {
            margin-right: 0.25rem;
         }

         .button {
            margin-left: 0.25rem;
            --icon-button-radius: 1.5rem;
            --icon-button-font-size: 0.9rem;
         }

         .border-right {
            @include border-right;
            margin-right: 0.5rem;
            padding-right: 0.5rem;
         }
      }
   }
</style>
