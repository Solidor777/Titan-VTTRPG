<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import DocumentCheckboxInput from '~/document/components/input/DocumentCheckboxInput.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import DocumentSkillSelect from '~/document/components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/components/select/DocumentAttributeSelect.svelte';
   import DocumentCheckDifficultySelect from '~/document/components/select/DocumentCheckDifficultySelect.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   // Setup context variables
   const document = getContext('document');
   const appState = getContext('applicationState');
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

         <div class="divider"/>

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

         <div class="divider"/>

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
               {$document.system.totaAspectCost}
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
                     <StatTag label={aspect.label} value={aspect.cost}/>
                  </div>
               {/each}
            </div>
         </ScrollingContainer>
      </div>
   {/if}
</div>

<style lang="scss">
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
         margin-top: var(--padding-large);

         &:not(:first-child) {
            @include border-top;

            padding-top: var(--padding-large);
         }

         &:last-child {
            margin-bottom: var(--padding-large);
         }
      }

      .casting-check-settings {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;

         padding: var(--padding-standard);
         width: calc(100% - 16px);

         .stat {
            @include flex-row;
            @include flex-group-center;

            height: 100%;

            .label {
               @include flex-row;
               @include flex-group-center;

               height: 100%;
               font-weight: bold;
               margin-right: var(--padding-standard);

               @include font-size-small;
            }

            .input {
               @include flex-row;
               @include flex-group-center;

               height: 100%;
               width: 32px;
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
            margin-left: var(--padding-large);
            padding-right: var(--padding-large);
         }
      }

      .aspect-costs {
         @include flex-column;

         padding: var(--padding-standard);
         height: 100%;
         width: 100%;

         .header {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom;

            padding-bottom: var(--padding-standard);
            margin-top: var(--padding-large);
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
