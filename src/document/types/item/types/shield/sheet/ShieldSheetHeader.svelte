<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentImagePicker from '~/document/svelte-components/input/DocumentImagePicker.svelte';
   import DocumentName from '~/document/svelte-components/input/DocumentNameInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentRaritySelect from '~/document/svelte-components/select/DocumentRaritySelect.svelte';
   import {CURRENCY_ICON, DEFENSE_ICON} from '~/system/Icons.js';

   /** @type object Reference to the Document store. */
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
         <DocumentName/>
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

         <!--Value-->
         <div class="stat">
            <!--Icon-->
            <i class="{CURRENCY_ICON}"/>

            <!--Label-->
            <div class="label">
               {localize('value')}
            </div>

            <!--Input-->
            <div class="input large-number">
               <DocumentIntegerInput
                  bind:value={$document.system.value}
                  min={0}
               />
            </div>
         </div>

         <!--Defense-->
         <div class="stat">
            <!--Icon-->
            <i class="{DEFENSE_ICON}"/>

            <!--Label-->
            <div class="label">
               {localize('defense')}
            </div>

            <!--Input-->
            <div class="input number">
               <DocumentIntegerInput
                  bind:value={$document.system.defense}
                  min={0}
               />
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

               i {
                  margin-right: var(--titan-padding-standard);
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

                  &.large-number {
                     --titan-input-width: 80px;
                  }
               }
            }
         }
      }
   }
</style>
