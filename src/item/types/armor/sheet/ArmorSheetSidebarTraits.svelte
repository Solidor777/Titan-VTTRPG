<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { localize } from '~/helpers/Utility.js';
   import { ARMOR_TRAIT_DESCRIPTIONS } from '~/item/types/armor/ArmorTraits.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import DocumentAddCustomTraitDialog from '~/documents/DocumentAddCustomTraitDialog';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';

   // Application statee reference
   const document = getContext('DocumentStore');
   const traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;
</script>

<div class="traits">
   <!--Edit Traits Button-->
   <div class="button">
      <EfxButton
         on:click={() => {
            $document.typeComponent.editArmorTraits();
         }}
      >
         <div class="button-contents">
            <i class="fas fa-pen-to-square" />
            <div class="label">
               {localize('editTraits')}
            </div>
         </div>
      </EfxButton>
   </div>

   <!--Add Custom Trait Button-->
   <div class="button">
      <EfxButton
         on:click={() => {
            const dialog = new DocumentAddCustomTraitDialog($document);
            dialog.render(true);
         }}
      >
         <div class="button-contents">
            <i class="fas fa-circle-plus" />
            <div class="label">
               {localize('addCustomTrait')}
            </div>
         </div>
      </EfxButton>
   </div>

   <!--Traits-->
   {#if $document.system.trait.length > 0 || $document.system.customTrait.length > 0}
      <div class="traits-container" transition:slide|local>
         {#each $document.system.trait as trait (trait.name)}
            <div
               class="trait"
               transition:slide|local
               use:tooltip={{
                  content: localize(traitDescriptions[trait.name]),
               }}
            >
               <Tag label={localize(trait.name)} />
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
   @import '../../../../Styles/Mixins.scss';

   .traits {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .button {
         @include flex-row;
         @include flex-group-center;

         margin-top: 0.5rem;
         --button-font-size: var(--font-size-small);
         --button-line-height: 1.25rem;

         &:not(:first-child) {
            margin-left: 0.25rem;
         }

         .button-contents {
            @include flex-row;
            @include flex-group-center;

            .label {
               @include flex-row;
               @include flex-group-center;
            }

            i {
               margin-right: 0.25rem;
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
