<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import DocumentCheckboxInput from '~/documents/components/input/DocumentCheckboxInput.svelte';
   import DocumentIntegerInput from '~/documents/components/input/DocumentIntegerInput.svelte';
   import DocumentSkillSelect from '~/documents/components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/documents/components/select/DocumentAttributeSelect.svelte';
   import DocumentCheckDifficultySelect from '~/documents/components/select/DocumentCheckDifficultySelect.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
   const appState = getContext('ApplicationStateStore');
</script>

<div class="casting-check-tab">
   <!--check Settings-->
   <div class="casting-check-settings">
      <!--Attribute and skill-->
      <div class="row">
         <!--Attribute-->
         <div class="stat">
            <div class="label">
               {localize('attribute')}
            </div>

            <div class="select">
               <DocumentAttributeSelect
                  bind:value={$document.system.castingCheck.attribute}
               />
            </div>
         </div>

         <div class="divider" />

         <!--Skill-->
         <div class="stat">
            <div class="label">
               {localize('skill')}
            </div>

            <div class="select">
               <DocumentSkillSelect
                  bind:value={$document.system.castingCheck.skill}
               />
            </div>
         </div>
      </div>

      <!--Auto Calculate check-->
      <div class="row">
         <!--check-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize('autoCalculateDC')}
            </div>

            <!--Checkbox-->
            <div class="casting-checkbox">
               <DocumentCheckboxInput
                  bind:value={$document.system.castingCheck.autoCalculateDC}
               />
            </div>
         </div>
      </div>

      <div class="row">
         <!--Difficulty-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize('difficulty')}
            </div>

            <!--Select-->
            <div class="select">
               <DocumentCheckDifficultySelect
                  bind:value={$document.system.castingCheck.difficulty}
                  disabled={$document.system.castingCheck.autoCalculateDC}
               />
            </div>
         </div>

         <div class="divider" />

         <!--Complexity-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize('complexity')}
            </div>

            <!--Input-->
            <div class="input">
               <DocumentIntegerInput
                  bind:value={$document.system.castingCheck.complexity}
                  min={1}
                  max={16}
                  disabled={$document.system.castingCheck.autoCalculateDC}
               />
            </div>
         </div>
      </div>

      <div class="row">
         <!--Difficulty-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize('totaAspectCost')}:
            </div>

            <!--Value-->
            <div class="value">
               {$document.spell.totaAspectCost}
            </div>
         </div>
      </div>
   </div>

   <!--Aspect Costs-->
   {#if $document.aspect && $document.aspect.length > 0}
      <div class="aspect-costs" transition:slide|local>
         <!--Header-->
         <div class="header">
            {localize('aspectCosts')}
         </div>

         <ScrollingContainer bind:scrollTop={$appState.scrollTop.castingCheck}>
            <!--Container-->
            <div class="costs-container" transition:slide|local>
               <!--Each Cost-->
               {#each $document.aspect as aspect}
                  <div class="cost">
                     <StatTag label={aspect.label} value={aspect.cost} />
                  </div>
               {/each}
            </div>
         </ScrollingContainer>
      </div>
   {/if}
</div>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';

   .casting-check-tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;

      .row {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.5rem;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.5rem;
         }

         &:last-child {
            margin-bottom: 0.5rem;
         }
      }

      .casting-check-settings {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;
         padding: 0.25rem;
         width: calc(100% - 1rem);

         .stat {
            @include flex-row;
            @include flex-group-center;
            height: 100%;

            .label {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               font-weight: bold;
               margin-right: 0.25rem;
               @include font-size-small;
            }

            .input {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 2rem;
            }

            .value {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
            }
         }

         .divider {
            @include border-left;
            height: 100%;
            margin-left: 0.5rem;
            padding-right: 0.5rem;
         }
      }

      .aspect-costs {
         @include flex-column;
         padding: 0.25rem;
         height: 100%;
         width: 100%;

         .header {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom;
            padding-bottom: 0.25rem;
            margin-top: 0.5rem;
            width: 100%;
            font-weight: bold;
         }

         .costs-container {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            flex-wrap: wrap;

            .cost {
               @include tag-margin;
               @include font-size-small;
            }
         }
      }
   }
</style>
