<script>
   /**
    * @typedef {object} MeterProps
    * @property {number} [max] - The maximum value of the meter.
    * @property {number} [min] - The minimum value of the meter.
    * @property {number} [value] - The current value of the meter.
    * @property {number} [meterScaleSpeed] - The speed at which the meter should animate, in percent per second.
    * @property {number} [updateInterval] - The interval between meter updates, in milliseconds.
    * @property {string} [testId] - Optional test identifier bound to the root element.
    */

   /** @type {MeterProps} */
   let {
      max = 1,
      min = 0,
      value = undefined,
      meterScaleSpeed = 10,
      updateInterval = 10,
      testId = void 0,
   } = $props();

   /** @type {number} The calculated percent of the meter. */
   let meterPercentWidth = $state(0);

   /** @type {number | null} Handle ID of the meter update function that fires on interval. */
   let updateHandle = $state(null);

   /** @type {number} The desired percent width of the meter. */
   let targetMeterPercentWidth = $state(0);

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

   // Update the meter in response to changes.
   $effect(() => {
      // Capture reactive dependencies inside the effect.
      const newTarget = (value / max - min) * 100;

      // Update the target percent width.
      targetMeterPercentWidth = newTarget;

      // If the target width and current width are different, begin updating the meter.
      if (meterPercentWidth !== newTarget && updateHandle === null) {
         updateHandle = setInterval(updateMeterWidth, updateInterval);
      }
   });
</script>

<div
   class="meter"
   data-testid={testId}
>
   <span style={`width: ${meterPercentWidth}%`}></span>
</div>

<style lang="scss">
   .meter {
      background: var(--titan-meter-background);
      border-radius: 25px;
      box-shadow: inset 0 -1px 1px rgb(255 255 255 / 0.3);
      display: flex;
      height: 24px;

      @include margin-left-standard;
      @include margin-right-standard;

      padding: 3px;
      width: 100%;

      span {
         background: var(--titan-meter-color);
         border-radius: 20px;
         box-shadow: inset 0 2px 9px var(--titan-meter-shadow-1);
         display: block;
         height: 100%;
         inset: 0 -2px 6px var(--titan-meter-shadow-2);
      }
   }
</style>
