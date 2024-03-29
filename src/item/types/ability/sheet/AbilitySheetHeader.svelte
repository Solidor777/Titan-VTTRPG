<svelte:options accessors={true} />

<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import DocumentImagePicker from '~/documents/components/DocumentImagePicker.svelte';
   import DocumentName from '~/documents/components/input/DocumentNameInput.svelte';
   import DocumentRaritySelect from '~/documents/components/select/DocumentRaritySelect.svelte';
   import DocumentIntegerInput from '~/documents/components/input/DocumentIntegerInput.svelte';
   import DocumentCheckboxInput from '~/documents/components/input/DocumentCheckboxInput.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
</script>

<!--Header-->
<div class="header">
   <div class="main-label">
      <!--Portrait-->
      <div class="portrait">
         <DocumentImagePicker path={'img'} alt={'item portrait'} />
      </div>

      <!--Label Stats-->
      <div class="label-stats">
         <!--Name-->
         <div class="name">
            <DocumentName />
         </div>

         <!--Secondary Stats-->
         <div class="secondary-stats">
            <!--Rarity-->
            <div class="stat">
               <!--Label-->
               <div class="label">
                  {localize('rarity')}
               </div>

               <!--Input-->
               <div class="input">
                  <DocumentRaritySelect bind:value={$document.system.rarity} />
               </div>
            </div>

            <!--XP Cost-->
            <div class="stat">
               <!--Label-->
               <div class="label">
                  {localize('xp')}
               </div>

               <!--Input-->
               <div class="input number">
                  <DocumentIntegerInput
                     bind:value={$document.system.xpCost}
                     min={0}
                  />
               </div>
            </div>
         </div>
      </div>
   </div>

   <div class="ability-types">
      <!--Action-->
      <div class="checkbox">
         <div class="label">
            {localize('action')}
         </div>
         <div class="input">
            <DocumentCheckboxInput bind:value={$document.system.action} />
         </div>
      </div>

      <!--Reaction-->
      <div class="checkbox">
         <div class="label">
            {localize('reaction')}
         </div>
         <div class="input">
            <DocumentCheckboxInput bind:value={$document.system.reaction} />
         </div>
      </div>

      <!--Passive-->
      <div class="checkbox">
         <div class="label">
            {localize('passive')}
         </div>
         <div class="input">
            <DocumentCheckboxInput bind:value={$document.system.passive} />
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';
   .header {
      @include border;
      @include flex-row;
      @include flex-space-between;
      @include panel-1;
      width: 100%;
      padding: 0.5rem;

      .main-label {
         @include flex-row;
         @include flex-group-left;
         width: 100%;

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
                     margin-right: 0.5rem;
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
      .ability-types {
         @include flex-column;
         @include flex-group-top;
         margin-right: 0.5rem;
         margin-left: 1.5rem;

         .checkbox {
            @include flex-row;
            @include flex-group-right;
            width: 100%;

            .label {
               @include flex-row;
               @include flex-group-right;
               font-weight: bold;
            }

            .input {
               @include flex-row;
               @include flex-group-left;
               width: 1rem;
            }
         }
      }
   }
</style>
