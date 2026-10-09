import { createSubscriber } from 'svelte/reactivity';

/**
 * Lists the documents whose ownership decides this document's `isOwner`, apart from the document itself: its
 * ancestors (an Item's Actor), the base actor of a token in its chain, and, for a chat message, the actor that spoke.
 * The base actor of an unlinked token is neither the token's synthetic actor nor an ancestor of it. Core rebuilds the
 * synthetic actor's data, ownership included, from the base actor when that changes
 * (`TokenDocument#_onUpdateBaseActor`); measured: the only update hook that fires is the base actor's. The permission
 * of a compendium document is not a document; the bridge reads it from the compendium configuration setting.
 * @param {foundry.abstract.Document} doc - The document.
 * @returns {foundry.abstract.Document[]} The documents; none of them is `doc`.
 */
function getOwnershipSources(doc) {
   /** @type {foundry.abstract.Document[]} The sources found so far. */
   const sources = [];
   for (let current = doc; current; current = current.parent) {
      if (current !== doc) {
         sources.push(current);
      }
      if (current.baseActor) {
         sources.push(current.baseActor);
      }
   }
   if (doc.documentName === 'ChatMessage') {
      /** @type {foundry.documents.Actor|null} The actor that spoke. */
      const speaker = doc.constructor.getSpeakerActor?.(doc.speaker);
      if (speaker) {
         sources.push(speaker);
         if (speaker.parent?.baseActor) {
            sources.push(speaker.parent.baseActor);
         }
      }
   }
   return sources.filter((source) => source !== doc);
}

/**
 * @class ReactiveDocument
 * Bridges a Foundry Document into Svelte 5 reactivity. `.data` returns the LIVE document; when read inside a component
 * or `$derived` it subscribes to the document's update hooks, to embedded item/effect create, update and delete hooks,
 * and to the ownership changes of the documents its `isOwner` depends on (for a compendium document, to changes of
 * the world's compendium configuration), so reactive readers re-run whenever the document or its permissions change.
 * Because `.data` is the live document, reactive reads (`.data.system.x`), writes (`.data.update(...)`),
 * collections (`.data.items`), and methods (`.data.system.someMethod()`) all work through the same accessor.
 */
export default class ReactiveDocument {
   /** @type {() => void} Subscriber registration returned by createSubscriber. */
   #subscribe;

   /**
    * Wraps the Document and registers hooks that invalidate reactive readers when it, its embedded children or the
    * ownership of its ownership sources change.
    * @param {foundry.abstract.Document} doc - The Document to wrap.
    */
   constructor(doc) {
      /** @type {foundry.abstract.Document} The live Document; source of truth for reads and writes. */
      this.doc = doc;

      // Registers the hooks that invalidate reactive readers. createSubscriber tears them down when the last reactive
      // reader unsubscribes (when the consuming UI unmounts).
      this.#subscribe = createSubscriber((update) => {
         const name = doc.documentName;

         /**
          * Invalidate when this document itself updates.
          * @param {foundry.abstract.Document} changed - The updated document.
          * @param {object} _diff - The change diff (unused).
          * @param {object} options - Flags accompanying the update, including whether diffing was applied.
          */
         const onUpdate = (changed, _diff, options) => {
            if (options?.diff === false) {
               return;
            }
            if (changed?.uuid === this.doc.uuid) {
               update();
            }
         };

         /**
          * Invalidate when an embedded item/effect belonging to this document changes. Documents are compared by
          * `uuid`: an unlinked token's synthetic actor shares its base actor's `id` and has its own `uuid`.
          * @param {foundry.abstract.Document} embedded - The embedded document.
          */
         const onEmbedded = (embedded) => {
            const parent = embedded?.parent;
            if (parent?.uuid === this.doc.uuid || parent?.parent?.uuid === this.doc.uuid) {
               update();
            }
         };

         /**
          * @type {Set<string>} The document names of the ownership sources, one hook each. A chat message always
          * listens to actors: its speaker is resolved when an update arrives, and may not exist when the bridge starts.
          */
         const sourceNames = new Set(getOwnershipSources(doc).map((source) => source.documentName));
         if (name === 'ChatMessage') {
            sourceNames.add('Actor');
         }

         /**
          * Invalidate when the ownership of an ownership source changes: this document's permissions come from that
          * document, and no update hook of this document fires for the change. Other updates of a source do not
          * invalidate. The check is the diff's `ownership` key, so it holds for an update that applied no diff too.
          * @param {foundry.abstract.Document} changed - The updated document.
          * @param {object} diff - The change diff.
          */
         const onSourceUpdate = (changed, diff) => {
            if (!diff || !Object.hasOwn(diff, 'ownership')) {
               return;
            }
            if (getOwnershipSources(this.doc).some((source) => source.uuid === changed?.uuid)) {
               update();
            }
         };

         /**
          * Invalidate when the world's compendium configuration changes: the permission of a compendium document
          * (ownership and lock of its pack) is read from that setting, and no document update hook fires for it. The
          * first configuration of a world creates the Setting document (`game.settings.set` creates it when none
          * exists, `client/helpers/client-settings.mjs` `#setWorld`), and a Setting document can be deleted, so the
          * create, update and delete hooks are all handled.
          * @param {foundry.documents.Setting} setting - The created, updated or deleted setting.
          */
         const onSetting = (setting) => {
            if (setting?.key === 'core.compendiumConfiguration') {
               update();
            }
         };

         const registered = [
            ...[...sourceNames].map((sourceName) => [
               `update${sourceName}`,
               Hooks.on(`update${sourceName}`, onSourceUpdate),
            ]),
            ...(doc.pack ? [
               [
                  'createSetting',
                  Hooks.on('createSetting', onSetting),
               ],
               [
                  'updateSetting',
                  Hooks.on('updateSetting', onSetting),
               ],
               [
                  'deleteSetting',
                  Hooks.on('deleteSetting', onSetting),
               ],
            ] : []),
            [
               `update${name}`,
               Hooks.on(`update${name}`, onUpdate),
            ],
            [
               'createItem',
               Hooks.on('createItem', onEmbedded),
            ],
            [
               'updateItem',
               Hooks.on('updateItem', onEmbedded),
            ],
            [
               'deleteItem',
               Hooks.on('deleteItem', onEmbedded),
            ],
            [
               'createActiveEffect',
               Hooks.on('createActiveEffect', onEmbedded),
            ],
            [
               'updateActiveEffect',
               Hooks.on('updateActiveEffect', onEmbedded),
            ],
            [
               'deleteActiveEffect',
               Hooks.on('deleteActiveEffect', onEmbedded),
            ],
         ];

         return () => registered.forEach(([hook, id]) => Hooks.off(hook, id));
      });
   }

   /**
    * The live document, made reactive when read in a component or `$derived`: reading it subscribes
    * to the document's update hooks so the reader re-runs on change.
    * @returns {foundry.abstract.Document} The live document.
    */
   get data() {
      this.#subscribe();
      return this.doc;
   }

   /**
    * Cleanup hook invoked by consumers on teardown (sheet close, chat-message delete). The `.data`
    * subscriber tears down its own hooks automatically when the last reactive reader unsubscribes
    * (on unmount), so this is a no-op retained for caller compatibility.
    */
   destroy() {
      // Intentionally empty — createSubscriber handles hook teardown on unsubscribe.
   }
}
