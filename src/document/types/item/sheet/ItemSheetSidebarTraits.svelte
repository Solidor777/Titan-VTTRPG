<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';
   import {CREATE_ICON} from '~/system/Icons.js';

   // Application statee reference
   const document = getContext('document');
</script>

<div class="traits">
   <!--Add Custom Trait Button-->
   <div class="button">
      <Button
         on:click={() => {
            $document.addCustomTrait();
         }}
      >
         <div class="button-contents">
            <i class="{CREATE_ICON}"/>
            <div class="label">
               {localize('addCustomTrait')}
            </div>
         </div>
      </Button>
   </div>

   <!--Traits-->
   {#if $document.system.customTrait.length > 0}
      <div class="traits-container" transition:slide|local>
         <!--Custom Traits-->
         {#each $document.system.customTrait as trait, idx (trait.uuid)}
            <div class="trait" transition:slide|local>
               <EditDeleteTag
                  label={trait.name}
                  editFunction={() => {
                     $document.editCustomTrait(idx);
                  }}
                  deleteFunction={() => {
                     $document.deleteCustomTrait(idx);
                  }}
                  labelTooltip={trait.description}
                  editTooltip={localize('editTrait')}
                  deleteTooltip={localize('deleteTrait')}
               />
            </div>
         {/each}
      </div>
   {/if}
</div>

<style lang="scss">
   .traits {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;

      .button {
         @include flex-row;
         @include flex-group-center;

         margin-top: var(--titan-padding-large);

         --titan-button-font-size: var(--titan-font-size-small);
         --titan-button-line-height: 20px;

         &:not(:first-child) {
            margin-left: var(--titan-padding-standard);
         }

         .button-contents {
            @include flex-row;
            @include flex-group-center;

            .label {
               @include flex-row;
               @include flex-group-center;
            }

            i {
               margin-right: var(--titan-padding-standard);
            }
         }
      }
   }

   .traits-container {
      @include list;
      @include flex-row;
      @include flex-group-center;

      flex-wrap: wrap;

      .trait {
         @include flex-row;
         @include flex-group-center;
         @include tag-margin;
         @include font-size-small;
      }
   }
</style>
