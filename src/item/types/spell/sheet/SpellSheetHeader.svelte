<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import DocumentImagePicker from '~/documents/components/DocumentImagePicker.svelte';
   import DocumentName from '~/documents/components/input/DocumentNameInput.svelte';
   import DocumentRaritySelect from '~/documents/components/select/DocumentRaritySelect.svelte';
   import DocumentTextInput from '~/documents/components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '../../../../documents/components/input/DocumentIntegerInput.svelte';

   // Get Context variables
   const document = getContext('DocumentStore');
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
         <!--Rarity-->
         <div class="stat">
            <!-- Label-->
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
            <!-- Label-->
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

         <!--Tradition-->
         <div class="stat text">
            <!-- Label-->
            <div class="label">
               {localize('tradition')}
            </div>

            <!--Input-->
            <div class="input text">
               <DocumentTextInput bind:value={$document.system.tradition} />
            </div>
         </div>
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
                  margin-right: 0.25rem;
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;

                  &.number {
                     width: 2rem;
                  }
               }
            }
         }
      }
   }
</style>
