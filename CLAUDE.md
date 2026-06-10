## graphify

This project has a knowledge graph at graphify-out/ (TITAN source + Foundry v14 client/common) with god nodes, community structure, and cross-file relationships.

Use graphify only when it beats reading the files directly — questions that span multiple files:

- Cross-file or architecture questions (tracing a flow through a subsystem, "what depends on X", anything that would otherwise mean opening 3+ files): run `graphify query "<question>"` first.
- The relationship between two components: `graphify path "<A>" "<B>"`. A focused concept overview: `graphify explain "<concept>"`.
- Broad architecture review: read graphify-out/GRAPH_REPORT.md. If graphify-out/wiki/index.md exists, use it for broad navigation.

Skip graphify and go straight to Read/Grep when:

- You already know the file or symbol — single-file reads, single-symbol lookups, or edit/debug work on specific code.
- The question is answerable from one or two files you can name.

Maintenance: after modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
