<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // The key / name of the attribute
   export let key;

   // The Character Data
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;

   // The attribute data
   $: attribute = $document.system.attribute[key];
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
      <div class="input" data-tooltip={localize(`${key}.editBaseValue`)}>
         <DocumentIntegerInput bind:value={$document.system.attribute[key].baseValue} />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input" data-tooltip={localize(`${key}.editStaticMod`)}>
         <DocumentIntegerInput bind:value={$document.system.attribute[key].staticMod} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-tooltip={localize(`${key}.value`)}>
         {attribute.value}
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
      align-items: center;
      justify-content: space-between;
      @include font-size-normal;
      box-sizing: border-box;

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
            height: 100%;
            width: 1.7rem;
            --input-border-radius: 10px;
         }

         .label {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            @include font-size-normal;

            &.final {
               font-weight: bold;
               width: 1rem;
            }
         }
      }
   }
</style>
