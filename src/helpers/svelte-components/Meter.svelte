<script>
   // Calculate the meter width
   export let max = 1;
   export let min = 0;
   export let current = void 0;
   export let meterScaleSpeed = 10;
   let meterWidth = (current / max - min) * 100;
   let meterUpdate = false;

   /**
    *
    */
   function updateMeterWidth() {
      if (meterWidth < targetMeterWidth) {
         meterWidth = Math.min(meterWidth + meterScaleSpeed, targetMeterWidth);
      }
      else if (meterWidth > targetMeterWidth) {
         meterWidth = Math.max(meterWidth - meterScaleSpeed, targetMeterWidth);
      }
      else {
         clearInterval(meterUpdate);
         meterUpdate = false;
      }
   }

   $: targetMeterWidth = (current / max - min) * 100;
   $: {
      if (meterWidth !== targetMeterWidth && meterUpdate === false) {
         meterUpdate = setInterval(updateMeterWidth, 10);
      }
   }
</script>

<div class="meter">
   <span style={`width: ${meterWidth}%`}/>
</div>

<style lang="scss">
   .meter {
      margin-left: var(--padding-standard);
      margin-right: var(--padding-standard);
      display: flex;
      height: 24px;
      width: 100%;
      background: var(--meter-background);
      border-radius: 25px;
      padding: 3px;
      box-shadow: inset 0 -1px 1px rgb(255 255 255 / 0.3);

      span {
         display: block;
         height: 100%;
         border-radius: 20px;
         background: var(--meter-color);
         box-shadow: inset 0 2px 9px var(--meter-shadow-1),
         inset 0 -2px 6px var(--meter-shadow-2);

         // overflow: hidden;
      }
   }
</style>
