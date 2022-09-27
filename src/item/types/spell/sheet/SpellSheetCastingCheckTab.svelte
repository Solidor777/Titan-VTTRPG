<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentCheckboxInput from "~/documents/components/input/DocumentCheckboxInput.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentIntegerSelect from "~/documents/components/select/DocumentIntegerSelect.svelte";
   import DocumentSkillSelect from "~/documents/components/select/DocumentSkillSelect.svelte";
   import DocumentAttributeSelect from "~/documents/components/select/DocumentAttributeSelect.svelte";

   // Document reference
   const document = getContext("DocumentStore");

   // Application refernce
   const application = getContext("external").application;

   const difficultyOptions = [2, 3, 4, 5, 6];
</script>

<div class="casting-check-tab">
   <!--check Settings-->
   <div class="casting-check-settings">
      <!--Auto Calculate check-->
      <div class="row">
         <!--check-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("autoCalculateCastingCheck")}
            </div>

            <!--Checkbox-->
            <div class="casting-checkbox">
               <DocumentCheckboxInput bind:value={$document.system.castingCheck.autoCalculateCheck} />
            </div>
         </div>
      </div>

      <div class="row">
         <!--Difficulty-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("difficulty")}
            </div>

            <!--Select-->
            <div class="select">
               <DocumentIntegerSelect
                  options={difficultyOptions}
                  bind:value={$document.system.castingCheck.difficulty}
                  disabled={$document.system.castingCheck.autoCalculateCheck}
               />
            </div>
         </div>

         <div class="divider" />

         <!--Complexity-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("complexity")}
            </div>

            <!--Input-->
            <div class="input">
               <DocumentIntegerInput
                  bind:value={$document.system.castingCheck.complexity}
                  min={1}
                  max={16}
                  disabled={$document.system.castingCheck.autoCalculateCheck}
               />
            </div>
         </div>
      </div>

      {#if !$document.system.castingCheck.autoCalculateCheck}
         <div class="row" transition:slide|local>
            <!--Difficulty-->
            <div class="stat">
               <!--Label-->
               <div class="label">
                  {localize("totalCost")}:
               </div>

               <!--Value-->
               <div class="value">
                  {$document.totalAspectCost}
               </div>
            </div>
         </div>
      {/if}

      <!--Attribute and skill-->
      <div class="row">
         <!--Attribute-->
         <div class="stat">
            <div class="label">
               {localize("attribute")}
            </div>

            <div class="select">
               <DocumentAttributeSelect bind:value={$document.system.castingCheck.attribute} />
            </div>
         </div>

         <div class="divider" />

         <!--Skill-->
         <div class="stat">
            <div class="label">
               {localize("skill")}
            </div>

            <div class="select">
               <DocumentSkillSelect bind:value={$document.system.castingCheck.skill} />
            </div>
         </div>
      </div>
   </div>

   <!--Aspects-->
   <div class="aspect-costs">
      <div class="header">
         {localize("aspectCosts")}
      </div>

      <ScrollingContainer bind:scrollTop={application.scrollTop.castingCheck}>
         <ol>
            {#each $document.aspects as aspect}
               <li>
                  <div class="label">
                     {aspect.label}
                  </div>
                  <div class="value">
                     {aspect.cost}
                  </div>
               </li>
            {/each}
         </ol>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .casting-check-tab {
      @include flex-column;
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
         width: 100%;
         background: var(--label-background-color);

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

         ol {
            @include grid(2);
            list-style: none;
            margin: 0.25rem 0 0 0;

            li {
               @include flex-row;
               @include flex-space-between;
               @include border;
               padding: 0.25rem;
               page-break-inside: avoid;
               background: var(--label-background-color);
               font-weight: bold;
            }
         }
      }
   }
</style>
