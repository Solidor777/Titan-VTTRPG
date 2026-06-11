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
         {`${localize('dc')} ${document.data.system.parameters.difficulty}:${
            document.data.system.parameters.complexity
         }`}
      </div>
      <div>
         {`${document.data.system.results.successes} ${localize('successes')}`}
      </div>
   </div>

   <!--Succeeded-->
   {#if document.data.system.results.succeeded}
      <div class="result succeeded">
         {localize('succeeded')}
      </div>

      <!--Extra Successes-->
      {#if document.data.system.results.extraSuccesses !== undefined}
         {#if document.data.system.results.extraSuccessesRemaining !== undefined}
            <div class="stat extra">
               {localize('extraSuccesses')}: {document.data.system.results
               .extraSuccessesRemaining}/{document.data.system.results
               .extraSuccesses}
            </div>
         {:else if document.data.system.results.extraSuccesses > 0}
            <div class="stat extra">
               {localize('extraSuccesses')}: {document.data.system.results
               .extraSuccesses}
            </div>
         {/if}
      {/if}
   {:else if document.data.system.parameters.complexity > 0}
      <!--Failed-->
      <div class="result failed">
         {localize('failed')}
      </div>
   {/if}

   <!--Expertise Remaining-->
   {#if document.data.system.parameters.totalExpertise}
      <div class="stat">
         <i class={EXPERTISE_ICON}></i>
         {localize('expertiseRemaining')}:
         {document.data.system.results.expertiseRemaining}

         <!--Reset Button-->
         {#if document.data.constructor.getSpeakerActor(document.data.speaker)?.isOwner}
            <div class="button">
               <CheckChatResetExpertiseButton/>
            </div>
         {/if}
      </div>
   {/if}

   {#if document.data.system.results.succeeded}
      <!--Damage-->
      {#if document.data.system.results.damage}
         <div class="stat">
            <i class={DAMAGE_ICON}></i>
            {localize('damage')}:
            {document.data.system.results.damage}
         </div>
      {/if}

      <!--Healing-->
      {#if document.data.system.results.healing > 0}
         <div class="stat">
            <i class={HEALING_ICON}></i>
            {localize('healing')}:
            {document.data.system.results.healing}
         </div>
      {/if}

      <!--Rend-->
      {#if document.data.system.parameters.rend && document.data.system.results.criticalSuccesses}
         <div class="stat" use:tooltipAction={'attack.rend.desc'}>
            <i class={REND_ICON}></i>
            {localize('rend')}:
            {document.data.system.results.criticalSuccesses}
         </div>
      {/if}

      <!--Cleave-->
      {#if document.data.system.parameters.cleave && document.data.system.results.criticalSuccesses}
         <div class="stat" use:tooltipAction={'attack.cleave.desc'}>
            <i class={CLEAVE_ICON}></i>
            {localize('cleave')}:
            {document.data.system.results.criticalSuccesses}
         </div>
      {/if}
   {/if}

   <!--Damage Taken-->
   {#if document.data.system.results.damageTaken}
      <div class="stat">
         <i class={DAMAGE_ICON}></i>
         {localize('damageTaken')}:
         {document.data.system.results.damageTaken}
      </div>
   {/if}

   <!--Rerolled failures-->
   {#if document.data.system.failuresReRolled}
      <div class="stat">
         <i class={DICE_ICON}></i>
         {localize('failuresReRolled')}
      </div>
   {/if}

   <!--Training Doubled-->
   {#if document.data.system.parameters.doubleTraining && document.data.system.parameters.totalTrainingDice > 0}
      <div class="stat">
         <i class={TRAINING_ICON}></i>
         {localize('trainingDoubled')}
      </div>
   {/if}

   <!--Expertise Doubled-->
   {#if document.data.system.parameters.doubleExpertise && document.data.system.parameters.totalExpertise > 0}
      <div class="stat">
         <i class={EXPERTISE_ICON}></i>
         {localize('expertiseDoubled')}
      </div>
   {/if}
</div>

<style lang="scss">
   // A column of centered result rows on a quiet panel; the tag fill would drown the paired
   // succeeded/failed colors, which are tuned against the chat surface.
   .results {
      @include border;
      @include flex-column;
      @include flex-group-center;
      @include panel-3;
      @include font-size-normal;
      @include padding-large;

      border-radius: var(--titan-border-radius);
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

         width: 100%;

         &:not(:first-child) {
            @include margin-top-standard;
         }

         &.extra {
            @include font-size-small;
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
