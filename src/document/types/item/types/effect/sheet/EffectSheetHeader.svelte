<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import DocumentImagePicker from '~/document/components/DocumentImagePicker.svelte';
   import DocumentName from '~/document/components/input/DocumentNameInput.svelte';
   import DocumentSelect from '~/document/components/select/DocumentSelect.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import DocumentTextInput from '~/document/components/input/DocumentTextInput.svelte';
   import DocumentIntegerIncrementInput from '~/document/components/input/DocumentIntegerIncrementInput.svelte';

   // Get Context variables
   const document = getContext('document');

   const durationOptions = [
      {
         value: 'turnEnd',
         label: localize('turnEnd'),
      },
      {
         value: 'turnStart',
         label: localize('turnStart'),
      },
      {
         value: 'initiative',
         label: localize('initiative'),
      },
      {
         value: 'permanent',
         label: localize('permanent'),
      },
      {
         value: 'custom',
         label: localize('custom'),
      },
   ];
</script>

<!--Header-->
<div class="header">
   <!--Portrait-->
   <div class="portrait">
      <DocumentImagePicker path={'img'} alt={'item portrait'}/>
   </div>

   <!--Name-->
   <div class="label-stats">
      <div class="name">
         <DocumentName/>
      </div>

      <!--Secondary Stats-->
      <div class="secondary-stats">
         <!--Duration Type-->
         <div class="stat">
            <!-- Label-->
            <div class="label">
               {localize('durationType')}
            </div>

            <!--Input-->
            <div class="input">
               <DocumentSelect
                  options={durationOptions}
                  bind:value={$document.system.duration.type}
               />
            </div>
         </div>

         {#if $document.system.duration.type === 'custom'}
            <!--Custom-->
            <div class="stat text">
               <!--Input-->
               <div class="input text">
                  <DocumentTextInput
                     bind:value={$document.system.duration.custom}
                  />
               </div>
            </div>
         {:else if $document.system.duration.type === 'initiative'}
            <div class="stat" transition:slide|local>
               <!--Input-->
               <div class="input number">
                  <DocumentIntegerInput
                     min={0}
                     bind:value={$document.system.duration.initiative}
                  />
               </div>
            </div>
         {/if}

         <!--Duration Remaining-->
         {#if $document.system.duration.type !== 'permanent'}
            <div class="stat" transition:slide|local>
               <!-- Label-->
               <div class="label">
                  {localize('remaining')}
               </div>

               <!--Input-->
               <div class="input number">
                  <DocumentIntegerIncrementInput
                     min={0}
                     bind:value={$document.system.duration.remaining}
                  />
               </div>
            </div>
         {/if}
      </div>
   </div>
</div>

<style lang="scss">
   .header {
      @include border;
      @include flex-row;
      @include flex-group-left;
      @include panel-1;
      width: 100%;
      padding: var(--padding-standard) var(--padding-large);

      .portrait {
         width: 80px;
         --border-style: none;
      }

      .label-stats {
         @include flex-column;
         @include flex-group-top-left;
         width: calc(100% - 88px);
         margin-left: var(--padding-large);

         .name {
            @include flex-row;
            @include flex-group-left;
            width: 100%;
         }

         .secondary-stats {
            @include flex-row;
            @include flex-group-left;
            margin-top: var(--padding-large);
            width: 100%;

            .stat {
               @include flex-row;
               @include flex-group-left;

               &:not(:first-child) {
                  @include border-left;
                  margin-left: var(--padding-large);
                  padding-left: var(--padding-large);
               }

               &.text {
                  width: 100%;
                  flex: 1;

                  .input {
                     width: 100%;
                  }
               }

               .label {
                  @include flex-row;
                  @include flex-group-left;
                  font-weight: bold;
                  margin-right: var(--padding-standard);
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;

                  &.number {
                     --input-width: 32px;
                  }
               }
            }
         }
      }
   }
</style>
