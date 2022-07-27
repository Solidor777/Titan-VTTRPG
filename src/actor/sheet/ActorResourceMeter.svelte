<script>
   import DocumentTextInput from "../../documents/components/DocumentTextInput.svelte";

   // Max value of the meter
   export let max;

   // Current value of the meter
   export let value;
   $: meterWidth = ((value / max) * 100).toString() + "%";

   // Tooltips
   export let meterTooltip;
   export let maxTooltip;
</script>

<div class="resource-meter">
   <!--Current Value Input-->
   <div class="value"><DocumentTextInput bind:value /></div>

   <!--The Mater-->
   <div class="meter">
      <span style="width: {meterWidth}" />
   </div>

   <!--Max Value Display-->
   <div class="max" data-tooltip={maxTooltip}>{max}</div>
</div>

<style lang="scss">
   .resource-meter {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;

      .value {
         box-sizing: border-box;
         width: 2rem;
         --border-radius: 50%;
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
         display: flex;
         align-items: center;
         justify-content: center;
         background: white;
         width: 2rem;
         height: 1.5rem;
         border-style: var(--border-style);
         border-width: var(--border-width);
         border-radius: 50%;
      }
   }
</style>
