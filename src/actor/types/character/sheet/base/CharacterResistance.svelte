<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // The key / name of the resistance
   export let key;

   // The Character Data
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;

   // Reactive resistance data
   $: resistance = $document.system.resistance[key];
</script>

<div class="resistance" data-resistance={key}>
   <!--Resistance Label-->
   <div class="button {key}" data-tooltip={localize(`${key}.desc`)}>
      <EfxButton on:click={application.rollResistanceCheck.bind(application, key)}>
         {localize(`${key}`)}
      </EfxButton>
   </div>

   <div class="stats">
      <!--Base Value-->
      <div class="label" data-tooltip={localize(`${key}.baseValue`)}>
         {resistance.baseValue}
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input" data-tooltip={localize(`${key}.editStaticMod`)}>
         <DocumentIntegerInput bind:value={$document.system.resistance[key].mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-tooltip={localize(`${key}.value`)}>
         {resistance.value}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .resistance {
      @include flex-row;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      box-sizing: border-box;
      @include font-size-normal;

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
         margin-left: 1rem;

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
