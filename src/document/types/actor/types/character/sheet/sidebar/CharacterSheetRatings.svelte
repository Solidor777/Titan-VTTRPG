<script>
   import { getContext } from 'svelte';
   import CharacterSheetRating from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetRating.svelte';
   import CharacterSheetRatingButton
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetRatingButton.svelte';
   import { ACCURACY_ICON, AWARENESS_ICON, DEFENSE_ICON, INITIATIVE_ICON, MELEE_ICON } from '~/system/Icons.js';

   const document = getContext('document');
</script>

<div class="ratings">
   <!--Initiative-->
   <div class="rating">
      <CharacterSheetRatingButton
         key={'initiative'}
         icon={INITIATIVE_ICON}
         onClick={() => {
            $document.requestInitiativeRoll();
         }}
      />
   </div>

   <!--Awareness-->
   <div class="rating">
      <CharacterSheetRating key={'awareness'} icon={AWARENESS_ICON}/>
   </div>

   <!--Defense-->
   <div class="rating">
      <CharacterSheetRating key={'defense'} icon={DEFENSE_ICON}/>
   </div>

   <!--Melee-->
   <div class="rating">
      <CharacterSheetRating key={'melee'} icon={MELEE_ICON}/>
   </div>

   <!--Accuracy-->
   <div class="rating">
      <CharacterSheetRating key={'accuracy'} icon={ACCURACY_ICON}/>
   </div>
</div>

<style lang="scss">
   .ratings {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .rating {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: var(--padding-standard);
            padding-top: var(--padding-standard);
         }
      }
   }
</style>
