<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentImagePicker from '~/document/components/DocumentImagePicker.svelte';
   import DocumentNameInput from '~/document/components/input/DocumentNameInput.svelte';
   import DocumentRaritySelect from '~/document/components/select/DocumentRaritySelect.svelte';
   import DocumentTextInput from '~/document/components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';

   // Get Context variables
   const document = getContext('document');
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
         <DocumentNameInput/>
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
               <DocumentRaritySelect bind:value={$document.system.rarity}/>
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
               <DocumentTextInput bind:value={$document.system.tradition}/>
            </div>
         </div>
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
                     width: 32px;
                  }
               }
            }
         }
      }
   }
</style>
