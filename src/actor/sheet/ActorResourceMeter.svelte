<script>
   import DocumentTextInput from "../../documents/components/DocumentTextInput.svelte";

   // Label of the mater
   export let label;

   // Max value of the meter
   export let max;

   // Current value of the meter
   export let value;

   // The static mod of the meter
   export let staticMod;

   // Tooltips
   export let valueTooltip;
   export let editStaticModTooltip;
   export let editValueTooltip;
   export let maxTooltip;

   // Calculate the meter width
   $: meterWidth = ((value / max) * 100).toString() + "%";
</script>

<div class="resource">
   <!--Label row-->
   <div class="row">
      <!--Spacer-->
      <div class="spacer" />

      <!--Label-->
      <span class="label" data-titan-tooltip={valueTooltip}>{label}</span>

      <!--Static Mod-->
      <div class="static-mod">
         +
         <div class="input" data-titan-tooltip={editStaticModTooltip}>
            <DocumentTextInput bind:value={staticMod} type="integer" />
         </div>
      </div>
   </div>

   <!--Meter bar row-->
   <div class="row">
      <!--Current Value Input-->
      <div class="input" data-titan-tooltip={editValueTooltip}><DocumentTextInput bind:value type="integer" /></div>

      <!--The Meter-->
      <div class="meter" data-titan-tooltip={valueTooltip}>
         <span style="width: {meterWidth}" />
      </div>

      <!--Max Value Display-->
      <div class="max" data-titan-tooltip={maxTooltip}>{max}</div>
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .resource {
      @include flex-column;
      @include flex-group-top;
      box-sizing: border-box;
      width: 100%;
      height: 100%;

      .row {
         @include flex-row;
         @include flex-space-between;
         width: 100%;
         height: 100%;
         padding-top: 0.25rem;
         font-weight: bold;

         .spacer {
            width: 5rem;
         }

         .label {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            height: 100%;
            font-weight: bold;
         }

         .static-mod {
            @include flex-row;
            @include flex-group-center;
            width: 5rem;
         }

         .input {
            --width-input: 2rem;
            --border-radius-input: 10px;
            margin-left: 0.25rem;
         }

         .meter {
            margin-left: 0.25rem;
            margin-right: 0.25rem;
            display: flex;
            height: 100%;
            width: 100%;
            position: relative;
            background: whitesmoke;
            border-radius: 25px;
            padding: 3px;
            box-shadow: inset 0 -1px 1px rgba(255, 255, 255, 0.3);

            span {
               display: block;
               height: 100%;
               border-radius: 20px;
               background-color: var(--meter-color);
               box-shadow: inset 0 2px 9px rgba(255, 255, 255, 0.3), inset 0 -2px 6px rgba(0, 0, 0, 0.4);
               position: relative;
               overflow: hidden;
            }
         }

         .max {
            box-sizing: border-box;
            @include flex-row;
            @include flex-group-center;
            @include border-normal;
            background-color: var(--color-background-highlight);
            font-weight: bold;
            font-size: 1.1rem;
            width: 3.2rem;
            height: 100%;
            text-align: center;
         }
      }
   }
</style>
