## About:
A success based roll system designed for virtual tabletop.

## Compendium packs

The shipped `TITAN Effects` compendium (`titan.effects`, the standard effects the Effect Tray browses) is
authored as one JSON document per effect under `packs/_source/effects/`, grouped into directories that
mirror its compendium folders (each holding a `_Folder.json`). The LevelDB pack Foundry reads is build
output and is not tracked.

- `npm run build:packs` compiles every `packs/_source/<name>` into `packs/<name>` (run by CI and the release
  workflow, and after a fresh clone or a source edit).
- `npm run extract:packs` writes a pack edited inside Foundry back to its JSON source.

Foundry holds an exclusive lock on every declared pack while a world is running, so return the world to
setup (or stop the server) before running either command.
