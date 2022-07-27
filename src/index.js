import { TitanActor } from "./actor/Actor";
import TitanPlayerSheet from "./actor/sheet/PlayerSheet";
import { TITANCONSTANTS } from "./helpers/Constants.mjs";
import { TITANLOCAL } from "./helpers/Local.mjs";

Hooks.once("init", async () => {
   console.log("TITAN | Starting Titan VTTRPG System");

   // Add custom constants for easy access
   CONFIG.TITAN = {
      constants: TITANCONSTANTS,
      local: TITANLOCAL,
   };

   // Register Document Classes
   CONFIG.Actor.documentClass = TitanActor;

   // Register Sheet Classes
   Actors.registerSheet("titan", TitanPlayerSheet, {
      types: ["player"],
      makeDefault: true,
   });

   return;
});
