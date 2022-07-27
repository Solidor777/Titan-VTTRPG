<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import TextInput from "./TextInput.svelte";
   // The value of the input
   export let value;

   // The type of input
   // Text or Number
   export let type;

   // The Label
   // Text or Number
   export let label;
</script>

<label for={value}>{label}</label>
<TextInput bind:value {type} />
