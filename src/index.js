import { TitanActor } from "./actor/Actor";
import TitanActorSheet from "./actor/sheet/ActorSheet";
import { TitanItem } from "./item/Item";

Hooks.once("init", async () => {
   game.titan = {
      TitanActor,
      TitanItem,
   };

   console.log("TITAN | Starting Titan VTTRPG System");

   Actors.registerSheet("titan", TitanActorSheet, {
      makeDefault: true,
   });

   return;
});
