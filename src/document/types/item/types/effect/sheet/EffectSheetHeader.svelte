<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import DocumentImagePicker from '~/document/svelte-components/input/DocumentImagePicker.svelte';
   import DocumentName from '~/document/svelte-components/input/DocumentNameInput.svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerIncrementInput from '~/document/svelte-components/input/DocumentIntegerIncrementInput.svelte';

   /** @type object Reference to the Document store. */
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
      <DocumentImagePicker alt={'item portrait'} bind:value={$document.img}/>
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
                  bind:value={$document.system.duration.type}
                  options={durationOptions}
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
      padding: var(--titan-padding-standard) var(--titan-padding-large);

      .portrait {
         width: 80px;

         --titan-border-style: none;
      }

      .label-stats {
         @include flex-column;
         @include flex-group-top-left;

         width: calc(100% - 88px);
         margin-left: var(--titan-padding-large);

         .name {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
         }

         .secondary-stats {
            @include flex-row;
            @include flex-group-left;

            margin-top: var(--titan-padding-large);
            width: 100%;

            .stat {
               @include flex-row;
               @include flex-group-left;

               &:not(:first-child) {
                  @include border-left;

                  margin-left: var(--titan-padding-large);
                  padding-left: var(--titan-padding-large);
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
                  margin-right: var(--titan-padding-standard);
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;

                  &.number {
                     --titan-input-width: 32px;
                  }
               }
            }
         }
      }
   }
</style>
