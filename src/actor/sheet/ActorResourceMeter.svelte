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
   export let meterTooltip;
   export let maxTooltip;

   // Calculate the meter width
   $: meterWidth = ((value / max) * 100).toString() + "%";
</script>

<div class="resource-meter">
   <!--Label row-->
   <div class="meter-row">
      <!--Spacer-->
      <div class="spacer" />

      <!--Label-->
      <span class="label">{label}</span>
      <!--Static Mod-->
      <div class="static-mod">
         <div>+</div>
         <div class="input">
            <DocumentTextInput bind:value={staticMod} type="integer" />
         </div>
      </div>
   </div>

   <!--Meter bar row-->
   <div class="meter-row">
      <!--Current Value Input-->
      <div class="value" data-titan-tooltip={valueTooltip}><DocumentTextInput bind:value type="integer" /></div>

      <!--The Meter-->
      <div class="meter" data-titan-tooltip={meterTooltip}>
         <span style="width: {meterWidth}" />
      </div>

      <!--Max Value Display-->
      <div class="max" data-titan-tooltip={maxTooltip}>{max}</div>
   </div>
</div>

<style lang="scss">
   .resource-meter {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      height: 100%;

      .meter-row {
         display: flex;
         width: 100%;
         height: 100%;
         flex-direction: row;
         justify-content: space-between;
         align-items: center;
         text-align: center;

         &:not(:first-child) {
            padding-top: 0.25rem;
         }

         .spacer {
            width: 2.5rem;
         }

         .label {
            font-weight: bold;
         }

         .static-mod {
            box-sizing: border-box;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            font-weight: bold;
            text-align: center;
            height: 100%;
            width: 2.5rem;
            --border-radius: 50%;

            .input {
               width: 1.5rem;
            }
         }

         .value {
            box-sizing: border-box;
            text-align: center;
            height: 100%;
            width: 2rem;
            --border-radius: 50%;
            --tooltip-delay: 1.2s;
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
            width: 2rem;
            height: 100%;
            text-align: center;
            border-style: var(--border-style);
            border-width: var(--border-width);
            border-radius: 50%;
         }
      }
   }
</style>
