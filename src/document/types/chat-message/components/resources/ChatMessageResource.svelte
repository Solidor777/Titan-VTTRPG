<script>
   /**
    * @typedef {object} ChatMessageResourceProps
    * @property {number} [max] The maximum value of the resource.
    * @property {number} [value] The current value of the resource.
    * @property {string} [icon] The icon class to display for this resource.
    * @property {string} [label] The localized label to display for this resource.
    */

   /** @type {ChatMessageResourceProps} */
   const { max = void 0, value = void 0, icon = void 0, label = void 0 } = $props();
</script>

<div class="resource">
   <i class={icon}/>
   <div class="label">{label}</div>
   <div>
      {`${value} / ${max}`}
   </div>
</div>

<style lang="scss">
   .resource {
      @include flex-row;
      @include flex-group-center;

      flex-wrap: wrap;

      .label {
         @include border-right;
         @include margin-right-large;
         @include padding-right-large;
      }

      i {
         @include margin-right-large;
      }
   }
</style>
