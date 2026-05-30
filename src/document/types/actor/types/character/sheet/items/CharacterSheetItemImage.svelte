<script>
   /**
    * @typedef {object} CharacterSheetItemImageProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetItemImageProps} */
   const { item = undefined } = $props();
</script>

<img class="item-image" src={item.img} alt="item"/>

<style lang="scss">
   .item-image {
      width: 32px;
      border: none;
   }
</style>
