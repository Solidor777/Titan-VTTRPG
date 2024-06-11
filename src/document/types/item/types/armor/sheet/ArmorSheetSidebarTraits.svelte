<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {ARMOR_TRAIT_DESCRIPTIONS} from '~/document/types/item/types/armor/ArmorTraits.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';
   import {CREATE_ICON, EDIT_ICON} from '~/system/Icons.js';

   // Application state reference
   const document = getContext('document');
   const traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;
</script>

<div class="traits">
   <!--Edit Traits Button-->
   <div class="button">
      <Button
         on:click={() => {
            $document.system.editArmorTraits();
         }}
      >
         <div class="button-contents">
            <i class="{EDIT_ICON}"/>
            <div class="label">
               {localize('editTraits')}
            </div>
         </div>
      </Button>
   </div>

   <!--Add Custom Trait Button-->
   <div class="button">
      <Button
         on:click={() => {
            $document.addCustomTrait()}}
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
   {#if $document.system.trait.length > 0 || $document.system.customTrait.length > 0}
      <div class="traits-container" transition:slide|local>
         {#each $document.system.trait as trait (trait.name)}
            <div
               class="trait"
               transition:slide|local
               use:tooltipAction="{ localize(traitDescriptions[trait.name])}"
            >
               <Tag label={localize(trait.name)}/>
            </div>
         {/each}

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
