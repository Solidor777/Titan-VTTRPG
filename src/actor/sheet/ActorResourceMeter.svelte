<script>
   import DocumentTextInput from "../../documents/components/DocumentTextInput.svelte";

   // Max value of the bar
   export let max;

   // Current value of the bar
   export let value;

   // Tooltips
   export let meterTooltip;
   export let maxTooltip;
</script>

<div class="resource-meter">
   <div class="value" data-tooltip={meterTooltip}><DocumentTextInput bind:value /></div>
   <meter {value} {max} data-tooltip={meterTooltip} />
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

      meter {
         margin-left: 0.25rem;
         margin-right: 0.25rem;
         display: flex;
         height: 100%;
         width: 100%;
         border-radius: 10px;
         -webkit-appearance: none;
         background: var(--meter-color);
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
