import { v4 as uuidv4 } from 'uuid';

export function getTurnResourceModTemplate(uuid) {
   return {
      operation: 'turnResourceMod',
      selector: 'turnStart',
      key: "stamina",
      value: 1,
      uuid: uuid ?? uuidv4()
   };
}

export function applyTurnResourceMod(mods) {
   const turnResourceMod = {};

   // Sort the mods by selector
   const turnStartMod = [];
   const turnEndMod = [];
   mods.forEech((mod) => {
      if (mod.selector === 'turnStart') {
         turnStartMod.push(mod);
      }
      else {
         turnEndMod.push(mod);
      }
   });

   // Sort the mods by key
   if (turnStartMod.length > 0) {
      turnResourceMod.turnStartMod = _sortModsByKey(turnStartMod);
   }

   if (turnEndMod.length > 0) {
      turnResourceMod.turnEndMod = _sortModsByKey(turnEndMod);
   }

   // Apply the mods to the actor
   if (turnResourceMod.turnStartMod || turnResourceMod.turnEndMod) {
      this.turnResourceMod = turnResourceMod;
   }
}

function _sortModsByKey(mods) {
   retVal = {};
   const staminaMod = 0;
   const resolveMod = 0;
   const woundsMod = 0;
   mods.forEach((mod) => {
      switch (mod.key) {
         case 'stamina': {
            staminaMod += mod.value;
            break;
         }
         case 'resolve': {
            resolveMod += mod.value;
            break;
         }
         default: {
            woundsMod += mod.value;
            break;
         }
      }
   });

   if (staminaMod.length > 0) {
      retVal.staminaMod = staminaMod;
   }

   if (resolveMod.length > 0) {
      retVal.resolveMod = resolveMod;
   }

   if (woundsMod.length > 0) {
      retVal.woundsMod = woundsMod;
   }
   return retVal;
}