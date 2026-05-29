<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentCheckboxInput from '~/document/svelte-components/input/DocumentCheckboxInput.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentCheckDifficultySelect
      from '~/document/svelte-components/select/DocumentCheckDifficultySelect.svelte';
   import DocumentDamageReducedBySelect
      from '~/document/svelte-components/select/DocumentDamageReducedBySelect.svelte';
   import {
      COLLAPSED_ICON,
      DAMAGE_ICON,
      DELETE_ICON,
      EXPANDED_ICON,
      HEALING_ICON,
      SPEND_RESOLVE_ICON,
   } from '~/system/Icons.js';
   import LabeledElement from '~/helpers/svelte-components/LabeledElement.svelte';

   /** @type {number} The index of the Check in the item's item checks array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {ItemCheck} The Check this component represents. */
   $: check = $document.system.check[idx];

   /** @type {boolean} Whether this component is currently expanded. */
   $: isExpanded = $appState.tabs.checks.isExpanded[idx];
</script>

{#if check}
   <div class="check" transition:slide|local>
      <!--Header-->
      <div class="header">
         <!--Expand Toggle-->
         <div>
            {#if isExpanded}
               <!--Collapse button-->
               <IconButton
                  icon={EXPANDED_ICON}
                  onclick={() => {
                     $appState.tabs.checks.isExpanded[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon={COLLAPSED_ICON}
                  onclick={() => {
                     $appState.tabs.checks.isExpanded[idx] = true;
                  }}
               />
            {/if}
         </div>

         <!--Label-->
         <div class="label">
            <DocumentTextInput bind:value={check.label}/>
         </div>

         <!--Delete button-->
         <div>
            <IconButton
               icon={DELETE_ICON}
               onclick={async () => {
                  $document.deleteCheck(idx);
               }}
            />
         </div>
      </div>

      {#if isExpanded}
         <div class="expandable-content" transition:slide|local>
            <div class="row">
               <!--Attribute Select-->
               <div class="field">
                  <LabeledElement
                     label={'attribute'}
                     tooltip={'check.attribute.desc'}
                  >
                     <DocumentAttributeSelect bind:value={check.attribute}/>
                  </LabeledElement>
               </div>

               <!--Skill Select-->
               <div class="field">
                  <LabeledElement
                     label={'skill'}
                     tooltip={'check.skill.desc'}
                  >
                     <DocumentSkillSelect
                        bind:value={check.skill}
                        allowNone={true}
                     />
                  </LabeledElement>
               </div>
            </div>

            <div class="row">
               <!--Difficulty Select-->
               <div class="field">
                  <LabeledElement
                     label={'difficulty'}
                     tooltip={'check.difficulty.desc'}
                  >
                     <DocumentCheckDifficultySelect bind:value={check.difficulty}/>
                  </LabeledElement>
               </div>

               <!--Complexity Input-->
               <div class="field">
                  <LabeledElement
                     label={'complexity'}
                     tooltip={'check.complexity.desc'}
                  >
                     <DocumentIntegerInput
                        bind:value={check.complexity}
                        min={1}
                        max={99}
                        maxDigits={2}
                     />
                  </LabeledElement>
               </div>
            </div>

            <div class="row">
               <!--Resistance Check Select-->
               <div class="field">
                  <LabeledElement
                     label={'resistanceCheck'}
                     tooltip={'check.resistance.desc'}
                  >
                     <DocumentResistanceSelect
                        bind:value={check.resistanceCheck}
                        allowNone={true}
                     />
                  </LabeledElement>
               </div>

               <!--Resolve Cost Input-->
               <div class="field">
                  <LabeledElement
                     label={'resolveCost'}
                     icon={SPEND_RESOLVE_ICON}
                     tooltip={'check.resolveCost.desc'}
                  >
                     <DocumentIntegerInput
                        bind:value={check.resolveCost}
                        max={99}
                        min={0}
                        maxDigits={2}
                     />
                  </LabeledElement>
               </div>
            </div>

            <!--Opposed Check Enabled-->
            <div class="row">
               <div class="field">
                  <LabeledElement
                     label={'opposedCheck'}
                     tooltip={'check.opposedCheck.enabled.desc'}
                  >
                     <DocumentCheckboxInput bind:value={check.opposedCheck.enabled}/>
                  </LabeledElement>
               </div>
            </div>

            {#if check.opposedCheck.enabled}
               <div class="row" transition:slide|local>
                  <!--Opposed Check Attribute Select-->
                  <LabeledElement
                     label={'attribute'}
                     tooltip={'check.opposedCheck.attribute.desc.text'}
                  >
                     <DocumentAttributeSelect bind:value={check.opposedCheck.attribute}/>
                  </LabeledElement>

                  <!--Opposed Check Skill Select-->
                  <LabeledElement
                     label={'skill'}
                     tooltip={'check.opposedCheck.skill.desc.text'}
                  >
                     <DocumentSkillSelect
                        bind:value={check.opposedCheck.skill}
                        allowNone={true}
                     />
                  </LabeledElement>
               </div>
            {/if}

            <div class="row">
               <!--Damage-->
               <div class="field">
                  <LabeledElement
                     label={'damage'}
                     icon={DAMAGE_ICON}
                     tooltip={'check.isDamage.desc'}
                  >
                     <DocumentCheckboxInput bind:value={check.isDamage}/>
                  </LabeledElement>
               </div>

               <!--Healing-->
               <div class="field">
                  <LabeledElement
                     label={'healing'}
                     icon={HEALING_ICON}
                     tooltip={'check.isHealing.desc'}
                  >
                     <DocumentCheckboxInput bind:value={check.isHealing}/>
                  </LabeledElement>
               </div>
            </div>

            <!--Healing and Damage specific data-->
            {#if check.isDamage || check.isHealing}
               <div class="row" transition:slide|local>
                  <!--Initial value-->
                  <div class="field">
                     <LabeledElement
                        label={'initialValue'}
                        tooltip={'check.initialValue.desc'}
                     >
                        <DocumentIntegerInput
                           bind:value={check.initialValue}
                           min={1}
                        />
                     </LabeledElement>
                  </div>

                  <!--Scaling-->
                  <div class="field">
                     <div class="field">
                        <LabeledElement
                           label={'scaling'}
                           tooltip={'check.scaling.desc'}
                        >
                           <DocumentCheckboxInput bind:value={check.scaling}/>
                        </LabeledElement>
                     </div>
                  </div>
               </div>

               {#if check.isDamage && (check.opposedCheck.enabled || check.resistanceCheck !== 'none')}
                  <!--Damage reduced by-->
                  <div class="row" transition:slide|local>
                     <div class="field">
                        <LabeledElement
                           label={'damageReducedBy'}
                           tooltip={'check.damageReducedBy.desc'}
                        >
                           <DocumentDamageReducedBySelect
                              bind:value={check.damageReducedBy}
                              allowResistanceCheck={check.resistanceCheck !== 'none'}
                              allowOpposedCheck={check.opposedCheck.enabled}
                           />
                        </LabeledElement>
                     </div>
                  </div>
               {/if}
            {/if}
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   .check {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include border;
         @include flex-row;
         @include flex-space-between;
         @include panel-1;
         @include padding-large;

         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin: 0 var(--titan-spacing-large);

            --input-font-size: var(--titan-font-size-large);
            --titan-input-height: 32px;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;
         @include padding-standard;

         --titan-label-font-size: var(--titan-font-size-small);
         --titan-input-font-size: var(--titan-font-size-small);

         width: calc(100% - 16px);


         .row {
            @include flex-row;
            @include flex-group-center;
            @include border-separated-row;
            @include padding-top-large;

            width: 100%;

            &:not(:first-child) {
               @include border-top;
               @include margin-top-large;
            }

            .field {
               @include flex-row;
               @include flex-group-center;
            }
         }
      }
   }
</style>
