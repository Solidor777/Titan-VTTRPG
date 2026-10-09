import error from '~/helpers/utility-functions/Error.js';
import immunityHandling from '~/helpers/Settings/ImmunityHandling.js';

/**
 * The removal each actor has in flight, so removals on one actor run one after another and each reads the effects its
 * predecessor left; two overlapping removals would otherwise both delete the same effect.
 * @type {WeakMap<TitanActor, Promise<number>>}
 */
const pendingRemovals = new WeakMap();

/**
 * Decides which of an actor's immune Active Effects Remove mode deletes. Algorithm: grounded labelling of an abstract
 * argumentation framework, an immunity source "attacking" each effect it covers. Source: [Dung 1995], "On the
 * acceptability of arguments and its fundamental role in nonmonotonic reasoning, logic programming and n-person
 * games"; labelling form [Caminada 2006], "On the issue of reinstatement in argumentation". An effect covered by an
 * item (items are never immunity targets, so they always stand), or by an effect that is itself kept, is removed; an
 * effect whose every covering effect is removed is kept, because its immunity ends with them; an effect left
 * undecided lies on an immunity cycle (two effects each immune to the other, or a longer ring) and stays, suppressed.
 * Chosen over removing every immune effect, which would delete both members of a mutually immune pair, and over an
 * ordering tiebreak, which the rules do not supply: a deletion is irreversible, a suppression is not.
 * @param {TitanActiveEffect[]} effects - The actor's Active Effects.
 * @param {(effect: TitanActiveEffect) => ImmunitySource[]} getSources - The immunity sources covering an effect.
 * @returns {TitanActiveEffect[]} The effects to delete, in the given order.
 */
export function resolveImmuneEffectRemovals(effects, getSources) {
   /** @type {Set<string>} The ids of the actor's Active Effects; a source id outside it is an item's. */
   const effectIds = new Set(effects.map((effect) => effect.id));

   /** @type {Map<string, ImmunitySource[]>} The covering sources of each immune effect, by effect id. */
   const coveredBy = new Map();
   for (const effect of effects) {
      /** @type {ImmunitySource[]} The sources covering this effect. */
      const sources = getSources(effect);
      if (sources.length > 0) {
         coveredBy.set(effect.id, sources);
      }
   }

   /** @type {Set<string>} The effects that stay: those no immunity covers, then those whose covers are all removed. */
   const kept = new Set([...effectIds].filter((id) => !coveredBy.has(id)));

   /** @type {Set<string>} The effects to delete. */
   const removed = new Set();

   // Label until a pass decides nothing; each deciding pass labels at least one more effect, so the loop ends.
   /** @type {boolean} Whether the last pass decided an effect. */
   let changed = true;
   while (changed) {
      changed = false;
      for (const [id, sources] of coveredBy) {
         if (kept.has(id) || removed.has(id)) {
            continue;
         }
         if (sources.some((source) => !effectIds.has(source.id) || kept.has(source.id))) {
            removed.add(id);
            changed = true;
         }
         else if (sources.every((source) => removed.has(source.id))) {
            kept.add(id);
            changed = true;
         }
      }
   }
   return effects.filter((effect) => removed.has(effect.id));
}

/**
 * Deletes the Active Effects a Character is immune to now, when the Immunity Handling setting is Remove, notifying
 * once per deleted effect.
 * @param {TitanActor} actor - The Character to reconcile.
 * @returns {Promise<number>} The number of Active Effects deleted.
 */
async function removeImmuneEffectsNow(actor) {
   if (immunityHandling() !== 'remove' || !actor.system?.isCharacter) {
      return 0;
   }

   /** @type {TitanActiveEffect[]} The effects to delete. */
   const effects = resolveImmuneEffectRemovals([...actor.effects], (effect) => actor.system.getImmunitySources(effect));
   if (effects.length === 0) {
      return 0;
   }

   // The notices are composed before the deletion, after which a deleted effect's sources are no longer derived.
   /** @type {string[]} One notice per deleted effect. */
   const notices = effects.map((effect) => game.i18n.format('LOCAL.immunityRemovedEffect.text', {
      actor: actor.name,
      effect: effect.name,
      sources: actor.system.getImmunitySources(effect).map((source) => source.name).join(', '),
   }));
   await actor.deleteEmbeddedDocuments('ActiveEffect', effects.map((effect) => effect.id));
   for (const notice of notices) {
      ui.notifications.info(notice);
   }
   return effects.length;
}

/**
 * Deletes the Active Effects a Character is immune to when the Immunity Handling setting is Remove; a mutually immune
 * pair or ring stays, suppressed (resolveImmuneEffectRemovals). Queued behind any removal already running on the same
 * actor, so it reads the effects that removal left; a failed predecessor does not stop it.
 * @param {TitanActor} actor - The Character to reconcile.
 * @returns {Promise<number>} The number of Active Effects deleted.
 */
export function removeImmuneEffects(actor) {
   /** @type {Promise<number>} This removal, run once the actor's pending one settles. */
   const removal = (pendingRemovals.get(actor) ?? Promise.resolve(0))
      .catch(() => 0)
      .then(() => removeImmuneEffectsNow(actor));
   pendingRemovals.set(actor, removal);
   return removal;
}

/**
 * Removes the Active Effects an actor is immune to, then, for a world actor, those of each of its unlinked tokens
 * whose delta holds effects or items of its own. The token pass runs after the world actor's deletions land, so an
 * effect a token inherits is deleted once, from its world actor; a token's own effects, and inherited effects its own
 * items make it immune to, are the token's to remove. A token whose delta holds nothing of its own mirrors its world
 * actor, so its synthetic actor is never materialized.
 * @param {TitanActor} actor - The changed actor.
 * @returns {Promise<void>}
 */
export async function removeImmuneEffectsWithDependents(actor) {
   await removeImmuneEffects(actor);
   if (actor.isToken) {
      return;
   }
   for (const token of actor.getDependentTokens()) {
      /** @type {object|null} The token's stored delta. */
      const delta = token.actorLink ? null : token._source.delta;
      if (!(delta?.effects?.length > 0 || delta?.items?.length > 0)) {
         continue;
      }

      /** @type {TitanActor|null} The token's synthetic actor. */
      const tokenActor = token.actor;
      if (tokenActor) {
         await removeImmuneEffects(tokenActor);
      }
   }
}

/**
 * Removes the Active Effects an actor is immune to, with its dependent tokens' (removeImmuneEffectsWithDependents),
 * reporting a failure through the project logger instead of rejecting.
 * @param {TitanActor} actor - The changed actor.
 * @returns {Promise<void>} Resolves once the removal settled; never rejects.
 */
export async function removeImmuneEffectsReporting(actor) {
   try {
      await removeImmuneEffectsWithDependents(actor);
   }
   catch (reason) {
      error(`Could not remove the effects "${actor.name}" is immune to.`, reason);
   }
}

/**
 * Removes, across the world, the Active Effects Characters are immune to: every world actor, with its unlinked tokens
 * holding effects or items of their own. Runs on the active GM only, when the Immunity Handling setting changes to
 * Remove, so no effect Suppress mode kept outlives the switch. An actor whose removal fails is reported and the rest
 * still run.
 * @returns {Promise<void>}
 */
export async function removeImmuneEffectsFromWorld() {
   if (!game.user.isActiveGM) {
      return;
   }
   for (const actor of game.actors) {
      await removeImmuneEffectsReporting(actor);
   }
}
