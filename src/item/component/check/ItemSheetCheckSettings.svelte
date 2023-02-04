<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import { slide } from 'svelte/transition';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentTextInput from '~/documents/components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/documents/components/input/DocumentIntegerInput.svelte';
   import DocumentResistanceSelect from '~/documents/components/select/DocumentResistanceSelect.svelte';
   import DocumentCheckboxInput from '~/documents/components/input/DocumentCheckboxInput.svelte';
   import DocumentSkillSelect from '~/documents/components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/documents/components/select/DocumentAttributeSelect.svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/select/CheckDifficultySelect.svelte';

   // Check idx
   export let idx = void 0;

   // Setup context variables
   const document = getContext('DocumentStore');
   const appState = getContext('ApplicationStateStore');

   $: check = $document.system.check[idx];
   $: isExpanded = $appState.isExpanded.checks[idx];
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
                  icon="fas fa-angle-double-down"
                  on:click={() => {
                     $appState.isExpanded.checks[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="fas fa-angle-double-right"
                  on:click={() => {
                     $appState.isExpanded.checks[idx] = true;
                  }}
               />
            {/if}
         </div>

         <!--Label-->
         <div class="label">
            <DocumentTextInput bind:value={check.label} />
         </div>

         <!--Delete button-->
         <div>
            <IconButton
               icon={'fas fa-trash'}
               on:click={async () => {
                  $document.removeCheck(idx);
               }}
            />
         </div>
      </div>

      {#if isExpanded}
         <div class="expandable-content" transition:slide|local>
            <div class="row">
               <!--Attribute Select-->
               <div class="field">
                  <!--Label-->
                  <div class="label">
                     {localize('attribute')}
                  </div>

                  <!--Value-->
                  <div class="input">
                     <DocumentAttributeSelect bind:value={check.attribute} />
                  </div>
               </div>

               <!--Skill Select-->
               <div class="field">
                  <!--Label-->
                  <div class="label">
                     {localize('skill')}
                  </div>

                  <!--Value-->
                  <div class="input">
                     <DocumentSkillSelect bind:value={check.skill} />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Difficulty Select-->
               <div class="field">
                  <!--Label-->
                  <div class="label">
                     {localize('difficulty')}
                  </div>

                  <!--Value-->
                  <div class="input">
                     <CheckDifficultySelect bind:value={check.difficulty} />
                  </div>
               </div>

               <!--Skill Select-->
               <div class="field">
                  <!--Label-->
                  <div class="label">
                     {localize('complexity')}
                  </div>

                  <!--Value-->
                  <div class="input number">
                     <DocumentIntegerInput
                        bind:value={check.complexity}
                        min={1}
                     />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Resistance Check-->
               <div class="field">
                  <!--Label-->
                  <div class="label">
                     {localize('resistanceCheck')}
                  </div>

                  <!--Value-->
                  <div class="input">
                     <DocumentResistanceSelect
                        bind:value={check.resistanceCheck}
                        allowNone={true}
                     />
                  </div>
               </div>

               <!--Resolve Cost-->
               <div class="field">
                  <!--Label-->
                  <div class="label">
                     {localize('resolveCost')}
                  </div>

                  <!--Value-->
                  <div class="input number">
                     <DocumentIntegerInput
                        bind:value={check.resolveCost}
                        min={0}
                     />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Damage-->
               <div class="field">
                  <!--Icon-->
                  <i class="fas fa-burst" />

                  <!--Label-->
                  <div class="label">
                     {localize('damage')}
                  </div>

                  <!--Value-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={check.isDamage} />
                  </div>
               </div>

               <!--Healing-->
               <div class="field">
                  <!--Icon-->
                  <i class="fas fa-heart" />

                  <!--Label-->
                  <div class="label">
                     {localize('healing')}
                  </div>

                  <!--Value-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={check.isHealing} />
                  </div>
               </div>
            </div>

            <!--Initial value-->
            {#if check.isDamage || check.isHealing}
               <div class="row" transition:slide|local>
                  <div class="field">
                     <!--Label-->
                     <div class="label">
                        {localize('initialValue')}
                     </div>

                     <!--Value-->
                     <div class="input number">
                        <DocumentIntegerInput
                           bind:value={check.initialValue}
                           min={0}
                        />
                     </div>
                  </div>

                  <!--Scaling-->
                  <div class="field">
                     <!--Label-->
                     <div class="label">
                        {localize('scaling')}
                     </div>

                     <!--Value-->
                     <div class="input checkbox">
                        <DocumentCheckboxInput bind:value={check.scaling} />
                     </div>
                  </div>
               </div>
            {/if}

            <div class="row">
               <!--Opposed Check-->
               <div class="field">
                  <!--Label-->
                  <div class="label">
                     {localize('opposedCheck')}
                  </div>

                  <!--Value-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput
                        bind:value={check.opposedCheck.enabled}
                     />
                  </div>
               </div>
            </div>

            {#if check.opposedCheck.enabled}
               <div class="row" transition:slide|local>
                  <!--Attribute Select-->
                  <div class="field">
                     <!--Label-->
                     <div class="label">
                        {localize('attribute')}
                     </div>

                     <!--Value-->
                     <div class="input">
                        <DocumentAttributeSelect
                           bind:value={check.opposedCheck.attribute}
                        />
                     </div>
                  </div>

                  <!--Skill Select-->
                  <div class="field">
                     <!--Label-->
                     <div class="label">
                        {localize('skill')}
                     </div>

                     <!--Value-->
                     <div class="input">
                        <DocumentSkillSelect
                           bind:value={check.opposedCheck.skill}
                           allowNone={true}
                        />
                     </div>
                  </div>
               </div>
            {/if}
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .check {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .header {
         @include border;
         @include flex-row;
         @include flex-space-between;
         @include panel-1;
         padding: 0.25rem;
         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin: 0 0.5rem;
            --input-font-size: var(--font-size-large);
            --input-height: 2rem;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;
         width: calc(100% - 1rem);
         padding: 0.25rem;
         @include font-size-small;

         .row {
            @include flex-row;
            @include flex-group-center;
            padding-top: 0.5rem;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               margin-top: 0.5rem;
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include border-left;
                  margin-left: 0.5rem;
                  padding-left: 0.5rem;
               }

               i {
                  margin-right: 0.25rem;
               }

               .label {
                  @include flex-row;
                  @include flex-group-center;
                  font-weight: bold;
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;
                  @include font-size-normal;

                  &:not(.checkbox) {
                     margin-left: 0.5rem;
                  }

                  &.number {
                     width: 2rem;
                  }
               }
            }
         }
      }
   }
</style>
