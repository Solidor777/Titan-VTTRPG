<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import ModTag from "~/helpers/svelte-components/tag/ModTag.svelte";

   // The key / name of the resistance
   export let key;

   // The Character Data
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;
</script>

<div class="resistance" data-resistance={key}>
   <!--Resistance Label-->
   <div class="button {key}" data-tooltip={localize(`${key}.desc`)}>
      <EfxButton on:click={application.rollAttributeCheck.bind(application, key)}>
         {localize(`${key}`)}
      </EfxButton>
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.resistance[key].baseValue} />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.resistance[key].mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value" data-tooltip={localize(`${key}.value`)}>
         <ModTag
            currentValue={$document.system.resistance[key].value}
            baseValue={$document.system.resistance[key].baseValue +
               $document.system.resistance[key].mod.effect +
               $document.system.resistance[key].mod.ability}
         />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";
   .resistance {
      @include flex-row;
      @include flex-group-center;
      height: 100%;
      width: 100%;

      .button {
         width: 6rem;

         &.reflexes {
            --button-background-color: var(--reflexes-color-bright);
         }

         &.resilience {
            --button-background-color: var(--resilience-color-bright);
         }

         &.willpower {
            --button-background-color: var(--willpower-color-bright);
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         margin-left: 0.5rem;

         :not(:first-child) {
            margin-left: 0.5rem;
         }

         .input {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            width: 1.75rem;
         }

         .label {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
         }

         .value {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            min-width: 1.75rem;
         }
      }
   }
</style>
