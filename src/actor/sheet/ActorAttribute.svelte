<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";

   // The key / name of the attribute
   export let key;

   // The Actor Data
   const document = getContext("DocumentSheetObject");

   // The attribute data
   $: attribute = $document.system.attribute[key];

   async function rollAttributeCheck(attribute) {
      $document.rollAttributeCheck({
         attribute: attribute,
         skill: "none",
      });
   }
</script>

<div class="attribute" data-attribute={key}>
   <!--attribute Label-->
   <button
      class="attribute-roll {key}"
      data-titan-tooltip={localize(`LOCAL.${key}.desc.label`)}
      on:click={rollAttributeCheck(key)}
      on:mousedown={preventDefault}
   >
      {localize(`LOCAL.${key}.label`)}
   </button>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input" data-titan-tooltip={localize(`LOCAL.${key}.editBaseValue.label`)}>
         <DocumentTextInput bind:value={$document.system.attribute[key].baseValue} type="integer" />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input" data-titan-tooltip={localize(`LOCAL.${key}.editStaticMod.label`)}>
         <DocumentTextInput bind:value={$document.system.attribute[key].staticMod} type="integer" />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-titan-tooltip={localize(`LOCAL.${key}.value.label`)}>
         {attribute.value}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .attribute {
      @include flex-row;
      @include flex-group-center;
      height: 100%;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      font-size: 1rem;
      box-sizing: border-box;

      button {
         @include border-normal;
         border-radius: 25px;
         width: 6rem;
         font-weight: bold;
         font-size: 1rem;
         border-color: var(--border-color-normal);

         &.body {
            background-color: var(--color-body-bright);
         }

         &.mind {
            background-color: var(--color-mind-bright);
         }

         &.soul {
            background-color: var(--color-soul-bright);
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
            --border-radius-input: 10px;
         }

         .label {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            font-size: 1rem;

            &.final {
               font-weight: bold;
               width: 1rem;
            }
         }
      }
   }
</style>
