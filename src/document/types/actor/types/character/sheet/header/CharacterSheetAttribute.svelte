<script>
   import { getContext } from 'svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';
   import CharacterSheetCondensedAttributeCheckButton
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetAttributeCheckButton.svelte';

   /** @type {string} - The Attribute that this component represents. */
   export let attribute;

   /** @type {getContext<Document>} Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="container">
   <!--Label Button-->
   <div class="button">
      <CharacterSheetCondensedAttributeCheckButton {attribute}/>
   </div>

   <!--Stats-->
   <div class="stats">

      <!--Base Value-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.attribute[attribute].baseValue}
         />
      </div>

      <!--Plus Sign-->
      <div class="sign">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.attribute[attribute].mod.static}
         />
      </div>

      <!--Equal Sign-->
      <div class="sign">=</div>

      <!--Total Value-->
      <div class="value">
         <ModifiableStatValueLabel
            abilityMod={$document.system.attribute[attribute].mod.ability}
            baseValue={$document.system.attribute[attribute].baseValue}
            effectMod={$document.system.attribute[attribute].mod.effect}
            equipmentMod={$document.system.attribute[attribute].mod.equipment}
            staticMod={$document.system.attribute[attribute].mod.static}
            value={$document.system.attribute[attribute].value}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .container {
      @include flex-row;
      @include flex-space-evenly;

      width: 100%;

      .button {
         width: 100%;
      }

      .stats {
         @include flex-row;
         @include flex-group-center;

         height: 100%;
         margin-left: var(--titan-spacing-large);

         :not(:first-child) {
            margin-left: var(--titan-spacing-standard);
         }

         .input {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            width: 28px;
         }

         .value {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            min-width: 28px;
         }
      }
   }
</style>
