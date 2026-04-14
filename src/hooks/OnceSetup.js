import setupConditions from '~/system/Conditions.js';

/**
 * Attached to the Setup hook.
 * Sets up system conditions.
 */
export default function onceSetup() {
   setupConditions();
}
