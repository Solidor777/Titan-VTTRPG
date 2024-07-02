<script>
   /** @type number The maximum value of the meter. */
   export let max = 1;

   /** @type number The minimum value of the meter. */
   export let min = 0;

   /** @type number The current value of the meter. */
   export let current = void 0;

   /** @type number The speed at which the meter should animate, in percent per second. */
   export let meterScaleSpeed = 10;

   /** @type number The interval between meter updates, in milliseconds. */
   export let updateInterval = 10;

   /** @type number The calculated percent of the meter. */
   let meterPercentWidth = (current / max - min) * 100;

   /** @type {number|null} Handle ID of the meter update function that fires on interval. */
   let updateHandle = null;

   /** @type number The desired percent width of the meter. */
   let targetMeterPercentWidth = meterPercentWidth;

   /**
    * Updates the meter width percent.
    */
   function updateMeterWidth() {
      // If the meter percent width is less than the target, increase it.
      if (meterPercentWidth < targetMeterPercentWidth) {
         meterPercentWidth = Math.min(meterPercentWidth + meterScaleSpeed, targetMeterPercentWidth);
      }

      // If the meter percent width is greater than the target, decrease it.
      else if (meterPercentWidth > targetMeterPercentWidth) {
         meterPercentWidth = Math.max(meterPercentWidth - meterScaleSpeed, targetMeterPercentWidth);
      }

      // If the meter percent width is equal to the target, clear the update handle.
      else {
         clearInterval(updateHandle);
         updateHandle = null;
      }
   }

   // Update the meter in reponse to changes.
   $: {
      // Update the target percent width
      targetMeterPercentWidth = (current / max - min) * 100;

      // If the target width and current width are different, begin updating the meter
      if (meterPercentWidth !== targetMeterPercentWidth && updateHandle === null) {
         updateHandle = setInterval(updateMeterWidth, updateInterval);
      }
   }
</script>

<div class="meter">
   <span style={`width: ${meterPercentWidth}%`}/>
</div>

<style lang="scss">
   .meter {
      background: var(--titan-meter-background);
      border-radius: 25px;
      box-shadow: inset 0 -1px 1px rgb(255 255 255 / 0.3);
      display: flex;
      height: 24px;
      margin-left: var(--titan-padding-standard);
      margin-right: var(--titan-padding-standard);
      padding: 3px;
      width: 100%;

      span {
         background: var(--meter-color);
         border-radius: 20px;
         box-shadow: inset 0 2px 9px var(--titan-meter-shadow-1);
         display: block;
         height: 100%;
         inset: 0 -2px 6px var(--titan-meter-shadow-2);
      }
   }
</style>
