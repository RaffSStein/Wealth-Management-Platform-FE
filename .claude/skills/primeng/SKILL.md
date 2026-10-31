---
name: primeng
description: Use when adding, changing, theming or debugging PrimeNG 21 components in WMP (p-button, p-table, p-select, p-datepicker, p-dialog, p-drawer, p-toast, p-stepper, forms inputs, tooltips, pass-through, design tokens, the Ledger preset). Looks APIs up in the PrimeNG MCP pinned to v21 and applies the repo's PrimeNG rules (no deprecated inputs, cascade layers, preset/token sync, known bugs). Not for PrimeVue/PrimeReact, and never for upgrading to PrimeNG 22+.
---

# PrimeNG 21 in WMP

Adapted for this repo from the official PrimeUI plugin skills (github.com/primefaces/primeui-plugins), which target
PrimeNG 22 and the v22 MCP tool set. WMP stays on **PrimeNG 21** (22+ is under the commercial PrimeUI license), so
this skill uses the `primeng` MCP server pinned to `@primeng/mcp@21.1.10` in `.mcp.json`.

## Before writing code

1. Check the installed version: `node -p "require('./node_modules/primeng/package.json').version"`. Never use docs
   or memory from v22 (primeng.dev now documents v22). If the MCP is missing, fall back to the typings in
   `node_modules/primeng/**/*.d.ts` and say the API was not checked against the docs.
2. Look at nearby components for the local pattern (imports, signals, reactive forms, inline template and styles).
3. Look up the component in the MCP. Call the narrowest tool first, and avoid broad searches when the component name
   is already known:

| Need | v21 MCP tool |
|---|---|
| Known component: inputs, templates, overview | `get_component`, then `get_component_props` / `get_component_events` / `get_component_slots` / `get_component_methods` |
| Unknown component for a use case | `suggest_component`, `search_components`, `search_all`, `find_by_prop`, `find_by_event`, `find_components_with_feature` |
| A code sample | `get_example` (component + section) or `get_usage_example`; `list_examples` to discover sections |
| Styling one component | `get_component_tokens` (design tokens), `get_component_pt` (pass-through keys), `get_component_styles` (CSS classes) |
| Theming concepts | `get_theming_guide`, `get_passthrough_guide`, `get_configuration` |
| Accessibility | `get_accessibility_info` (per component), `get_accessibility_guide` |
| Version changes | `migrate_v20_to_v21`, `get_migration_guide` |

Never invent inputs, outputs, token paths or pass-through keys. If the MCP does not document something, check the
typings; if they don't have it either, it is unsupported.

## Repo rules (these override MCP examples)

- **No deprecated APIs.** Check `@deprecated` in `node_modules/primeng` typings before using any input. Known
  ones: no `label`/`icon` inputs on the `pButton` directive (use `<p-button>` or `pButtonLabel`/`pButtonIcon`), `class`
  instead of `styleClass`, `motionOptions` instead of any `*TransitionOptions`, no `@angular/animations`.
- **Submit buttons outside their form** (onboarding `[actions]` slot): native `<button pButton type="submit" form="id">`.
  `<p-button>` doesn't forward `form`, so the form silently never submits.
- **DatePicker** uses `dataType="string" dateFormat="yy-mm-dd"` (BE date format).
- **Toasts** go through `ToastService` (facade over the root `MessageService`), never a new `<p-toast>`.
- **Header dropdowns** render inside the header element, not in `p-popover` (it detaches under the sticky header).
- **Busy CTAs**: `[loading]="action.pending()"` with `busyAction()`; don't hand-roll loading signals.
- **Icons** are Material Symbols (`src/styles/_icons.scss`), not PrimeIcons; icon-only buttons need `aria-label`.

## Theming

- Preset: `src/app/theme/ledger.preset.ts` (Aura base) holds the **same hex values** as `src/styles/_tokens.scss`.
  Change both or neither. Dark mode selector `.wmp-dark`.
- Cascade layers: `wmp-reset < wmp-legacy < primeng < unlayered`. Component styles are unlayered, so they can override
  PrimeNG. Global element rules in `_forms.scss` live in `wmp-legacy` and never beat PrimeNG.
- Order of preference for a visual change: a component input or template, then component design tokens (`dt` or the
  preset), then pass-through, then component CSS using `--wmp-*` tokens. Never hard-code hex values.
- Check the result in both themes; `/dev/ui-kit` shows every PrimeNG component used by the app in both.

## Known issues

- `<p-motion>` (Stepper, Accordion panels) keeps the SSR `display: none` after hydration. Use these only on
  client-rendered routes (`app/**`, `onboarding/**`, `dev/**` in `app.routes.server.ts`), or not on prerendered pages.

## Finish

Run `npm run build`; run the affected specs (see CLAUDE.md for headless Edge). Say which APIs were checked in the MCP
and which only in the typings, and what still needs a visual check.
