import '~/styles/Fonts.scss';
import '~/styles/Variables.scss';
import '~/styles/Mixins.scss';
import '~/styles/Global.scss';
import onceInit from '~/hooks/OnceInit';
import onceSetup from '~/hooks/OnceSetup';
import onceReady from '~/hooks/OnceReady';
import onRenderChatMessage from '~/hooks/OnRenderChatMessage';
import onPreDeleteChatMessage from '~/hooks/OnPreDeleteChatMessage';
import onRenderJournalSheet from '~/hooks/OnRenderJournalSheet.js';
import onRenderJournalTextPageSheet from '~/hooks/OnRenderJournalTextPageSheet';
import onGetChatLogEntryContext from '~/hooks/OnGetChatLogEntryContext.js';
import onGetItemDirectoryEntryContext from '~/hooks/OnGetItemDirectoryEntryContext.js';
import onGetActorDirectoryEntryContext from '~/hooks/OnGetActorDirectoryEntryContext.js';
import onCombatNextTurn from '~/hooks/OnCombatNextTurn.js';

Hooks.once('init', onceInit);

Hooks.once('setup', onceSetup);

Hooks.once('ready', onceReady);

Hooks.on('renderChatMessage', onRenderChatMessage);

Hooks.on('preDeleteChatMessage', onPreDeleteChatMessage);

Hooks.on('renderJournalSheet', onRenderJournalSheet);

Hooks.on('renderJournalTextPageSheet', onRenderJournalTextPageSheet);

Hooks.on('getChatLogEntryContext', onGetChatLogEntryContext);

Hooks.on('getItemDirectoryEntryContext', onGetItemDirectoryEntryContext);

Hooks.on('getActorDirectoryEntryContext', onGetActorDirectoryEntryContext);

Hooks.on('combatNextTurn', onCombatNextTurn);
