<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import ModTag from "~/helpers/svelte-components/tag/ModTag.svelte";

   // The key / name of the attribute
   export let key;

   // The Character Data
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;
</script>

<div class="attribute" data-attribute={key}>
   <!--attribute Label-->
   <div class="button {key}" data-tooltip={localize(`${key}.desc`)}>
      <EfxButton on:click={application.rollAttributeCheck.bind(application, key)}>
         {localize(`${key}`)}
      </EfxButton>
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.attribute[key].baseValue} />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.attribute[key].mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value" data-tooltip={localize(`${key}.value`)}>
         <ModTag
            currentValue={$document.system.attribute[key].value}
            baseValue={$document.system.attribute[key].baseValue +
               $document.system.attribute[key].mod.effect +
               $document.system.attribute[key].mod.ability}
         />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .attribute {
      @include flex-row;
      @include flex-group-center;
      height: 100%;
      width: 100%;

      .button {
         width: 6rem;
         &.body {
            --button-background-color: var(--body-color-bright);
         }

         &.mind {
            --button-background-color: var(--mind-color-bright);
         }

         &.soul {
            --button-background-color: var(--soul-color-bright);
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
