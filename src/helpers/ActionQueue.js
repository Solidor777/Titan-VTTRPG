import delay from '~/helpers/utility-functions/Delay.js';

/**
 * Because some Foundry updates are asynchronous, (such as actor updates),
 * we need a way to ensure that certain events occur in a specific order,
 * such as for deriving state modifications from active effects,
 * or for deleting effects that have expired.
 * To this, we have the Action Queue, which accepts functions and inputs,
 * and ensures they resolve in the proper order.
 */
export default class ActionQueue {
   /**
    * Constructs a new Action Queue.
    * @param {number} defaultDelay - How many milliseconds (minimum of 1) that the action queue
    * will wait between resolving actions by default.
    * This can be overridden with the Delay property on the input object when
    * enqueuing an action.
    */
   constructor(defaultDelay = 100) {
      // Initial state
      this.isActive = false;
      this.queue = [];
      this.currentAction = null;
      this.defaultDelay = Math.max(defaultDelay, 1);
   }

   /**
    * Enqueues a new action object.
    * @param {object} action - Object containing the properties of the action being performed.
    * @param {Function} action.callback - The function to be performed by the action.
    * @param {object} action.thisArg - The 'this' context to use for the action. May be null.
    * @param {*[]?} action.args - Optional arguments for the function being performed, in order.
    * @param {number?} action.delay - The delay to wait before attempting this action. If not specified,
    * the default delay will be used.
    * @param {string} action.key - An identifier that may be used to enqueue the action.
    * If the action is enqueued while an action with the same key is already
    * in the queue, then it will be ignored.
    * If the previous action is already being performed,
    * then the duplicate action will be called again.
    * @returns {Promise<*>} The return value of the action being queued.
    */
   async enqueue(action) {
      // If the action is not already in the queue
      if (!this.queue.some((queuedAction) => queuedAction.key === action.key)) {

         // Add the action to the queue
         this.queue.push(action);

         // If the queue is not already going, start the queue
         if (this.isActive === false) {
            this.isActive = true;
            this.runQueue();
         }

         // Wait for this action to become the current action
         while (this.currentAction === null || this.currentAction.key !== action.key) {
            await delay(this.defaultDelay);
         }

         // Call the function
         let retVal;
         if (action.thisArg) {
            retVal = await action.callback.apply(action.thisArg, action.args);
         }

         // Clear the current action
         this.currentAction = null;

         // Return the result
         return retVal;
      }
   }

   /**
    * Starts the action queue, and continues to dequeue actions until the queue is empty.
    * @returns {Promise<void>} Finishes when the action queue is empty.
    */
   async runQueue() {
      // While there are still objections in the queue
      while (this.queue.length > 0) {

         // Get the current action
         const currentAction = this.queue[0];

         // Wait for the action's delay or the default delay if no delay has been specific
         await delay(currentAction.delay ?? this.defaultDelay);

         // Set the current action and remove it from the queue.
         // The enqueuing function will handle executing it.
         this.currentAction = this.queue.shift();

         // Wait for the current action to be finished executing
         while (this.currentAction !== null) {
            await delay(this.defaultDelay);
         }
      }

      // Update the state once the queue is empty
      this.isActive = false;
   }

   /**
    * Returns when the queue has been cleared of actions.
    * Useful if you need to know that no actions are currently in progress.
    * @returns {Promise<void>}
    */
   async onQueueEmpty() {
      while (this.queue.length > 0) {
         await delay(this.defaultDelay);
      }
   }
}
