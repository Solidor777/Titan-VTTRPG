<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentCheckboxInput from '~/document/svelte-components/input/DocumentCheckboxInput.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentCheckDifficultySelect from '~/document/svelte-components/select/DocumentCheckDifficultySelect.svelte';
   import DocumentDamageReducedBySelect from '~/document/svelte-components/select/DocumentDamageReducedBySelect.svelte';
   import {
      COLLAPSED_ICON,
      DAMAGE_ICON,
      DELETE_ICON,
      EXPANDED_ICON,
      HEALING_ICON,
      SPEND_RESOLVE_ICON,
   } from '~/system/Icons.js';

   // Check idx
   export let idx = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');

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
                  icon="{EXPANDED_ICON}"
                  on:click={() => {
                     $appState.isExpanded.checks[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="{COLLAPSED_ICON}"
                  on:click={() => {
                     $appState.isExpanded.checks[idx] = true;
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
                     <DocumentAttributeSelect bind:value={check.attribute}/>
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
                        bind:value={check.skill}
                        allowNone={true}
                     />
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
                     <DocumentCheckDifficultySelect
                        bind:value={check.difficulty}
                     />
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
                  <!--Icon-->
                  <i class="{SPEND_RESOLVE_ICON}"/>

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
                  <i class="{DAMAGE_ICON}"/>

                  <!--Label-->
                  <div class="label">
                     {localize('damage')}
                  </div>

                  <!--Value-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={check.isDamage}/>
                  </div>
               </div>

               <!--Healing-->
               <div class="field">
                  <!--Icon-->
                  <i class="{HEALING_ICON}"/>

                  <!--Label-->
                  <div class="label">
                     {localize('healing')}
                  </div>

                  <!--Value-->
                  <div class="input checkbox">
                     <DocumentCheckboxInput bind:value={check.isHealing}/>
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
                           min={1}
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
                        <DocumentCheckboxInput bind:value={check.scaling}/>
                     </div>
                  </div>
               </div>

               {#if check.isDamage && (check.opposedCheck.enabled || check.resistanceCheck !== 'none')}
                  <!--Damage reduced by-->
                  <div class="row" transition:slide|local>
                     <div class="field">
                        <!--Label-->
                        <div class="label">
                           {localize('damageReducedBy')}
                        </div>

                        <!--Value-->
                        <div class="input">
                           <DocumentDamageReducedBySelect
                              bind:value={check.damageReducedBy}
                              allowResistanceCheck={check.resistanceCheck !== 'none'}
                              allowOpposedCheck={check.opposedCheck.enabled}
                           />
                        </div>
                     </div>
                  </div>
               {/if}
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
   .check {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include border;
         @include flex-row;
         @include flex-space-between;
         @include panel-1;

         padding: var(--titan-padding-standard);
         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin: 0 var(--titan-padding-large);

            --input-font-size: var(--titan-font-size-large);
            --titan-input-height: 32px;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;

         width: calc(100% - 16px);
         padding: var(--titan-padding-standard);

         @include font-size-small;

         .row {
            @include flex-row;
            @include flex-group-center;

            padding-top: var(--titan-padding-large);
            width: 100%;

            &:not(:first-child) {
               @include border-top;

               margin-top: var(--titan-padding-large);
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include border-left;

                  margin-left: var(--titan-padding-large);
                  padding-left: var(--titan-padding-large);
               }

               i {
                  margin-right: var(--titan-padding-standard);
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
                     margin-left: var(--titan-padding-large);
                  }

                  &.number {
                     width: 32px;
                  }
               }
            }
         }
      }
   }
</style>
