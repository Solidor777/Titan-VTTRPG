<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
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

   // Document reference
   const document = getContext('document');
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
         <i class={EXPERTISE_ICON}/>
         {localize('expertiseRemaining')}:
         {$document.flags.titan.results.expertiseRemaining}

         <!--Reset Button-->
         {#if $document.constructor.getSpeakerActor($document.speaker)?.isOwner}
            <div class="button">
               <CheckChatResetExpertiseButton/>
            </div>
         {/if}
      </div>
   {/if}

   {#if $document.flags.titan.results.succeeded}
      <!--Damage-->
      {#if $document.flags.titan.results.damage}
         <div class="stat">
            <i class={DAMAGE_ICON}/>
            {localize('damage')}:
            {$document.flags.titan.results.damage}
         </div>
      {/if}

      <!--Healing-->
      {#if $document.flags.titan.results.healing > 0}
         <div class="stat">
            <i class="{HEALING_ICON}"/>
            {localize('healing')}:
            {$document.flags.titan.results.healing}
         </div>
      {/if}

      <!--Rend-->
      {#if $document.flags.titan.parameters.rend && $document.flags.titan.results.criticalSuccesses}
         <div
            class="stat"
            use:tooltip={{ content: localize('attack.rend.desc') }}
         >
            <i class={REND_ICON}/>
            {localize('rend')}:
            {$document.flags.titan.results.criticalSuccesses}
         </div>
      {/if}

      <!--Cleave-->
      {#if $document.flags.titan.parameters.cleave && $document.flags.titan.results.criticalSuccesses}
         <div
            class="stat"
            use:tooltip={{ content: localize('attack.cleave.desc') }}
         >
            <i class={CLEAVE_ICON}/>
            {localize('cleave')}:
            {$document.flags.titan.results.criticalSuccesses}
         </div>
      {/if}
   {/if}

   <!--Damage Taken-->
   {#if $document.flags.titan.results.damageTaken}
      <div class="stat">
         <i class={DAMAGE_ICON}/>
         {localize('damageTaken')}:
         {$document.flags.titan.results.damageTaken}
      </div>
   {/if}

   <!--Rerolled failures-->
   {#if $document.flags.titan.failuresReRolled}
      <div class="stat">
         <i class={DICE_ICON}/>
         {localize('failuresReRolled')}
      </div>
   {/if}

   <!--Training Doubled-->
   {#if $document.flags.titan.parameters.doubleTraining && $document.flags.titan.parameters.totalTrainingDice > 0}
      <div class="stat">
         <i class={TRAINING_ICON}/>
         {localize('trainingDoubled')}
      </div>
   {/if}

   <!--Expertise Doubled-->
   {#if $document.flags.titan.parameters.doubleExpertise && $document.flags.titan.parameters.totalExpertise > 0}
      <div class="stat">
         <i class={EXPERTISE_ICON}/>
         {localize('expertiseDoubled')}
      </div>
   {/if}
</div>

<style lang="scss">
   .results {
      @include border;
      @include flex-column;
      @include flex-group-center;
      @include label;
      @include font-size-normal;

      font-weight: bold;
      width: 100%;
      padding: var(--titan-padding-large);

      .result {
         @include flex-row;
         @include flex-group-center;
         @include font-size-large;

         width: 100%;
         font-weight: bold;

         &.succeeded {
            color: var(--titan-succeeded-color);
         }

         &.failed {
            color: var(--titan-failed-color);
         }
      }

      .stat {
         @include flex-row;
         @include flex-group-center;

         &:not(:first-child) {
            margin-top: var(--titan-padding-standard);
         }

         i {
            margin-right: var(--titan-padding-standard);
         }

         .button {
            margin-left: var(--titan-padding-standard);

            --titan-icon-button-radius: 24px;
            --titan-icon-button-font-size: 14px;
         }

         .border-right {
            @include border-right;

            margin-right: var(--titan-padding-large);
            padding-right: var(--titan-padding-large);
         }
      }
   }
</style>
