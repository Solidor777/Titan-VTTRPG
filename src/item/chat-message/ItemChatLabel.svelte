<script>
   import { getContext } from "svelte";
   const document = getContext("DocumentSheetObject");

   // Chat context reference
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="label">
   <img src={chatContext.img} alt="item" />
   <div class="name">{chatContext.name}</div>
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .label {
      @include flex-row;
      @include flex-group-left;
      @include border;
      padding: 0.5rem;
      background: var(--label-background-color);

      img {
         background: black;
         border-radius: 10px;
         width: 2.5rem;
      }

      .name {
         @include flex-row;
         @include flex-group-center;
         margin-left: 0.5rem;
         height: 100%;
         font-size: 1.2rem;
         font-weight: bold;
      }
   }
</style>
