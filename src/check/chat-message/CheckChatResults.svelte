<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import CheckChatResetExpertiseButton from '~/check/chat-message/CheckChatResetExpertiseButton.svelte';
   import {
      CLEAVE_ICON,
      DAMAGE_ICON,
      DICE_ICON,
      EXPERTISE_ICON,
      HEALING_ICON,
      REND_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="results">
   <!--Successes-->
   <div class="stat">
      <div class="border-right">
         {`${localize('dc')} ${document.data.flags.titan.parameters.difficulty}:${
            document.data.flags.titan.parameters.complexity
         }`}
      </div>
      <div>
         {`${document.data.flags.titan.results.successes} ${localize('successes')}`}
      </div>
   </div>

   <!--Succeeded-->
   {#if document.data.flags.titan.results.succeeded}
      <div class="result succeeded">
         {localize('succeeded')}
      </div>

      <!--Extra Successes-->
      {#if document.data.flags.titan.results.extraSuccesses !== undefined}
         {#if document.data.flags.titan.results.extraSuccessesRemaining !== undefined}
            <div class="stat">
               {localize('extraSuccesses')}: {document.data.flags.titan.results
               .extraSuccessesRemaining}/{document.data.flags.titan.results
               .extraSuccesses}
            </div>
         {:else if document.data.flags.titan.results.extraSuccesses > 0}
            <div class="stat">
               {localize('extraSuccesses')}: {document.data.flags.titan.results
               .extraSuccesses}
            </div>
         {/if}
      {/if}
   {:else if document.data.flags.titan.parameters.complexity > 0}
      <!--Failed-->
      <div class="result failed">
         {localize('failed')}
      </div>
   {/if}

   <!--Expertise Remaining-->
   {#if document.data.flags.titan.parameters.totalExpertise}
      <div class="stat">
         <i class={EXPERTISE_ICON}></i>
         {localize('expertiseRemaining')}:
         {document.data.flags.titan.results.expertiseRemaining}

         <!--Reset Button-->
         {#if document.data.constructor.getSpeakerActor(document.data.speaker)?.isOwner}
            <div class="button">
               <CheckChatResetExpertiseButton/>
            </div>
         {/if}
      </div>
   {/if}

   {#if document.data.flags.titan.results.succeeded}
      <!--Damage-->
      {#if document.data.flags.titan.results.damage}
         <div class="stat">
            <i class={DAMAGE_ICON}></i>
            {localize('damage')}:
            {document.data.flags.titan.results.damage}
         </div>
      {/if}

      <!--Healing-->
      {#if document.data.flags.titan.results.healing > 0}
         <div class="stat">
            <i class={HEALING_ICON}></i>
            {localize('healing')}:
            {document.data.flags.titan.results.healing}
         </div>
      {/if}

      <!--Rend-->
      {#if document.data.flags.titan.parameters.rend && document.data.flags.titan.results.criticalSuccesses}
         <div class="stat" use:tooltipAction={'attack.rend.desc'}>
            <i class={REND_ICON}></i>
            {localize('rend')}:
            {document.data.flags.titan.results.criticalSuccesses}
         </div>
      {/if}

      <!--Cleave-->
      {#if document.data.flags.titan.parameters.cleave && document.data.flags.titan.results.criticalSuccesses}
         <div class="stat" use:tooltipAction={'attack.cleave.desc'}>
            <i class={CLEAVE_ICON}></i>
            {localize('cleave')}:
            {document.data.flags.titan.results.criticalSuccesses}
         </div>
      {/if}
   {/if}

   <!--Damage Taken-->
   {#if document.data.flags.titan.results.damageTaken}
      <div class="stat">
         <i class={DAMAGE_ICON}></i>
         {localize('damageTaken')}:
         {document.data.flags.titan.results.damageTaken}
      </div>
   {/if}

   <!--Rerolled failures-->
   {#if document.data.flags.titan.failuresReRolled}
      <div class="stat">
         <i class={DICE_ICON}></i>
         {localize('failuresReRolled')}
      </div>
   {/if}

   <!--Training Doubled-->
   {#if document.data.flags.titan.parameters.doubleTraining && document.data.flags.titan.parameters.totalTrainingDice > 0}
      <div class="stat">
         <i class={TRAINING_ICON}></i>
         {localize('trainingDoubled')}
      </div>
   {/if}

   <!--Expertise Doubled-->
   {#if document.data.flags.titan.parameters.doubleExpertise && document.data.flags.titan.parameters.totalExpertise > 0}
      <div class="stat">
         <i class={EXPERTISE_ICON}></i>
         {localize('expertiseDoubled')}
      </div>
   {/if}
</div>

<style lang="scss">
   .results {
      @include border;
      @include flex-column;
      @include flex-group-center;
      @include tag;
      @include font-size-normal;
      @include padding-large;

      font-weight: bold;
      width: 100%;

      .result {
         @include flex-row;
         @include flex-group-center;
         @include font-size-large;

         width: 100%;
         font-weight: bold;

         &.succeeded {
            color: var(--titan-succeeded-font-color);
         }

         &.failed {
            color: var(--titan-failed-font-color);
         }
      }

      .stat {
         @include flex-row;
         @include flex-group-center;

         &:not(:first-child) {
            @include margin-top-standard;
         }

         i {
            @include margin-right-standard;
         }

         .button {
            @include margin-left-standard;

            --titan-icon-button-radius: 24px;
            --titan-button-font-size: 14px;
         }

         .border-right {
            @include border-right;
            @include margin-right-large;
            @include padding-right-large;
         }
      }
   }
</style>
