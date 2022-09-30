<script>
   // Calculate the meter width
   export let max = 1;
   export let min = 0;
   export let current = void 0;

   // Calculate the meter width
   $: meterWidth = ((current / max - min) * 100).toString() + "%";
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
      background: whitesmoke;
      border-radius: 25px;
      padding: 3px;
      box-shadow: inset 0 -1px 1px rgba(255, 255, 255, 0.3);

      span {
         display: block;
         height: 100%;
         border-radius: 20px;
         background: var(--meter-color);
         box-shadow: inset 0 2px 9px rgba(255, 255, 255, 0.3), inset 0 -2px 6px rgba(0, 0, 0, 0.4);
         position: relative;
         overflow: hidden;
      }
   }
</style>
