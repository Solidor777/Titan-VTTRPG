<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import { slide } from 'svelte/transition';
   import DocumentImagePicker from '~/documents/components/DocumentImagePicker.svelte';
   import DocumentName from '~/documents/components/input/DocumentNameInput.svelte';
   import DocumentSelect from '~/documents/components/select/DocumentSelect.svelte';
   import DocumentIntegerInput from '../../../../documents/components/input/DocumentIntegerInput.svelte';

   // Get Context variables
   const document = getContext('DocumentStore');

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
         value: 'permanent',
         label: localize('permanent'),
      },
   ];
</script>

<!--Header-->
<div class="header">
   <!--Portrait-->
   <div class="portrait">
      <DocumentImagePicker path={'img'} alt={'item portrait'} />
   </div>

   <!--Name-->
   <div class="label-stats">
      <div class="name">
         <DocumentName />
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

         <!--Duration Remaining-->
         {#if $document.system.duration.type !== 'permanent'}
            <div class="stat" transition:slide|local>
               <!-- Label-->
               <div class="label">
                  {localize('remaining')}
               </div>

               <!--Input-->
               <div class="input number">
                  <DocumentIntegerInput
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
   @import '../../../../Styles/Mixins.scss';

   .header {
      @include border;
      @include flex-row;
      @include flex-group-left;
      @include panel-1;
      width: 100%;
      padding: 0.25rem 0.5rem;

      .portrait {
         width: 5rem;
         --border-style: none;
      }

      .label-stats {
         @include flex-column;
         @include flex-group-top-left;
         width: calc(100% - 5.5rem);
         margin-left: 0.5rem;

         .name {
            @include flex-row;
            @include flex-group-left;
            width: 100%;
         }

         .secondary-stats {
            @include flex-row;
            @include flex-group-left;
            margin-top: 0.5rem;
            width: 100%;

            .stat {
               @include flex-row;
               @include flex-group-left;

               &:not(:first-child) {
                  @include border-left;
                  margin-left: 0.5rem;
                  padding-left: 0.5rem;
               }

               .label {
                  @include flex-row;
                  @include flex-group-left;
                  font-weight: bold;
                  margin-right: 0.25rem;
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;

                  &.number {
                     --input-width: 2rem;
                  }
               }
            }
         }
      }
   }
</style>
