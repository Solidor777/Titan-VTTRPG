<script>
   /**
    * @typedef {object} EffectTrayRowProps
    * @property {object} effect - The ActiveEffect document for this row.
    */

   /** @type {EffectTrayRowProps} */
   const { effect } = $props();
</script>

<div
   class="effect-tray-row"
   data-effect-id={effect.id}
   data-testid="effect-tray-row"
>
   <img
      alt=""
      class="effect-tray-row-icon"
      src={effect.img}
   />
   <span class="effect-tray-row-name">{effect.name}</span>
</div>

<style lang="scss">
   .effect-tray-row {
      @include flex-row;
      @include flex-group-left;
      @include padding-standard;

      width: 100%;

      .effect-tray-row-icon {
         width: 32px;
         height: 32px;
         border: none;
         object-fit: contain;
      }

      .effect-tray-row-name {
         @include margin-left-standard;

         overflow: hidden;
         text-overflow: ellipsis;
         white-space: nowrap;
      }
   }
</style>
