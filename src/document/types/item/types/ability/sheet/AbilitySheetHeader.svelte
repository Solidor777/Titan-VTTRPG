<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentImagePicker from '~/document/components/DocumentImagePicker.svelte';
   import DocumentName from '~/document/components/input/DocumentNameInput.svelte';
   import DocumentRaritySelect from '~/document/components/select/DocumentRaritySelect.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import DocumentCheckboxInput from '~/document/components/input/DocumentCheckboxInput.svelte';

   // Setup context variables
   const document = getContext('document');
</script>

<!--Header-->
<div class="header">
   <div class="main-label">
      <!--Portrait-->
      <div class="portrait">
         <DocumentImagePicker path={'img'} alt={'item portrait'}/>
      </div>

      <!--Label Stats-->
      <div class="label-stats">
         <!--Name-->
         <div class="name">
            <DocumentName/>
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
                  <DocumentRaritySelect bind:value={$document.system.rarity}/>
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
            <DocumentCheckboxInput bind:value={$document.system.action}/>
         </div>
      </div>

      <!--Reaction-->
      <div class="checkbox">
         <div class="label">
            {localize('reaction')}
         </div>
         <div class="input">
            <DocumentCheckboxInput bind:value={$document.system.reaction}/>
         </div>
      </div>

      <!--Passive-->
      <div class="checkbox">
         <div class="label">
            {localize('passive')}
         </div>
         <div class="input">
            <DocumentCheckboxInput bind:value={$document.system.passive}/>
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   .header {
      @include border;
      @include flex-row;
      @include flex-space-between;
      @include panel-1;
      width: 100%;
      padding: var(--padding-large);

      .main-label {
         @include flex-row;
         @include flex-group-left;
         width: 100%;

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

                  .label {
                     @include flex-row;
                     @include flex-group-left;
                     font-weight: bold;
                     margin-right: var(--padding-large);
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

      .ability-types {
         @include flex-column;
         @include flex-group-top;
         margin-right: var(--padding-large);
         margin-left: 24px;

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
               width: 16px;
            }
         }
      }
   }
</style>
