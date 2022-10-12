export default async function regainResolve(actor) {
   // Check if the actor's resolve is less than max
   const resolve = actor.system.resource.resolve;

   // If so, update the actor
   if (resolve.value < resolve.maxValue) {
      await actor.update({
         system: {
            resource: {
               resolve: {
                  value: resolve.value + 1
               }
            }
         }
      });

      // Send a report
      const chatContext = {
         type: 'resolveRegainReport',
         actorName: actor.name,
         resolve: {
            value: actor.system.resource.resolve.value,
            maxValue: actor.system.resource.resolve.maxValue
         }
      };

      ChatMessage.create({
         user: game.user.id,
         speaker: ChatMessage.getSpeaker({ actor: actor }),
         type: CONST.CHAT_MESSAGE_TYPES.OTHER,
         sound: CONFIG.sounds.notification,
         whisper: game.users.filter((user) =>
            actor.testUserPermission(user, 'OWNER')
         ),
         flags: {
            titan: {
               chatContext: chatContext
            }
         }
      });
   }
}