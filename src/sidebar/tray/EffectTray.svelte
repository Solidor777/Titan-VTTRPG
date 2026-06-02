<script>
   import EffectTrayHeader from '~/sidebar/tray/EffectTrayHeader.svelte';
   import EffectTrayList from '~/sidebar/tray/EffectTrayList.svelte';
</script>

<div
   class="titan-effect-tray"
   data-testid="effect-tray"
>
   <EffectTrayHeader />
   <EffectTrayList />
</div>

<style lang="scss">
   .titan-effect-tray {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;
      overflow: hidden;
   }
</style>
