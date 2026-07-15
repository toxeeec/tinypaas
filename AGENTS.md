# Agent Guidance

## Vendored Repositories

External repositories are vendored under `repos/` as Git subtrees.

- Use them as read-only reference material when working with the corresponding libraries.
- Prefer their source, tests, and documentation over guesses, `node_modules`, or web search results.
- Do not edit files under `repos/` unless explicitly asked.
- Do not import from `repos/`; application code must use normal package dependencies.

When writing Effect code, inspect @repos/effect/ for examples of idiomatic usage, tests, module structure, and API design. Treat it as the source of truth for Effect patterns.
