<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentImagePicker from '~/document/svelte-components/input/DocumentImagePicker.svelte';
   import DocumentNameInput from '~/document/svelte-components/input/DocumentNameInput.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import ItemSheetRaritySelect from '~/document/types/item/sheet/ItemSheetRaritySelect.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
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
               <ItemSheetRaritySelect/>
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
      padding: var(--titan-spacing-standard) var(--titan-spacing-large);

      .portrait {
         width: 80px;

         --titan-border-style: none;
      }

      .label-stats {
         @include flex-column;
         @include flex-group-top-left;

         width: calc(100% - 88px);
         margin-left: var(--titan-spacing-large);

         .name {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
         }

         .secondary-stats {
            @include flex-row;
            @include flex-group-left;

            margin-top: var(--titan-spacing-large);
            width: 100%;

            .stat {
               @include flex-row;
               @include flex-group-left;

               &:not(:first-child) {
                  @include border-left;

                  margin-left: var(--titan-spacing-large);
                  padding-left: var(--titan-spacing-large);
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
                  margin-right: var(--titan-spacing-standard);
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
