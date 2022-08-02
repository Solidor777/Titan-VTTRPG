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

   async function rollattribute(attribute) {
      $document.rollattributeCheck({
         attribute: attribute,
         getOptions: true,
      });
   }
</script>

<div class="attribute" data-attribute={key}>
   <!--attribute Label-->
   <button
      class="attribute-roll {key}"
      data-titan-tooltip={localize(`LOCAL.${key}.desc.label`)}
      on:click={rollattribute(key)}
      on:mousedown={preventDefault}
   >
      {localize(`LOCAL.${key}.label`)}
   </button>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input" data-titan-tooltip={localize(`LOCAL.${key}.baseValue.label`)}>
         <DocumentTextInput bind:value={$document.system.attribute[key].baseValue} type="integer" />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input" data-titan-tooltip={localize(`LOCAL.${key}.editStaticMod.label`)}>
         <DocumentTextInput bind:value={$document.system.attribute[key].staticMod} type="integer" />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.value.label`)}>
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

      button {
         @include border-normal;
         border-radius: 25px;
         width: 6rem;
         font-weight: bold;
         font-size: 1rem;
         border-color: var(--border-color-normal);

         &.reflexes {
            background-color: var(--color-reflexes-bright);
         }

         &.resilience {
            background-color: var(--color-resilience-bright);
         }

         &.willpower {
            background-color: var(--color-willpower-bright);
         }
      }

      .label {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         font-weight: bold;
         font-size: 1rem;
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         margin-left: 0.25rem;

         :not(:first-child) {
            margin-left: 0.25rem;
         }

         .input {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            height: 100%;
            width: 1.8rem;
            --border-radius-input: 10px;
         }
      }
   }
</style>
