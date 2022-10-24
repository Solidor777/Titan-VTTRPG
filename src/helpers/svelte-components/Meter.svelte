<script>
   // Calculate the meter width
   export let max = 1;
   export let min = 0;
   export let current = void 0;

   // Calculate the meter width
   $: meterWidth = max > min ? `${(current / max - min) * 100}%`.toString() : "0";
</script>

<div class="meter">
   <span style="width: {meterWidth}" />
</div>

<style lang="scss">
   .meter {
      margin-left: 0.25rem;
      margin-right: 0.25rem;
      display: flex;
      height: 100%;
      width: 100%;
      box-sizing: border-box;
      position: relative;
      background: var(--meter-background);
      border-radius: 25px;
      padding: 3px;
      box-shadow: inset 0 -1px 1px rgba(255, 255, 255, 0.3);

      span {
         display: block;
         height: 100%;
         border-radius: 20px;
         background: var(--meter-color);
         box-shadow: inset 0 2px 9px var(--meter-shadow-1), inset 0 -2px 6px var(--meter-shadow-2);
         position: relative;
         overflow: hidden;
      }
   }
</style>
