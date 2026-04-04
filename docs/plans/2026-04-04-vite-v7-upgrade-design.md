# Design: Upgrade Vite 5 to Vite 7

**Date**: 2026-04-04
**Branch**: `003-outlook-pst-mvp`
**Status**: Approved

## Summary

Upgrade the project build toolchain from Vite 5.4.x to Vite 7.3.x for improved performance, bug fixes, and ecosystem alignment. This is a low-risk upgrade because the project does not use any of the removed or significantly changed features (SSR, Sass, splitVendorChunkPlugin, custom resolve.conditions).

## Motivation

- Vite 5 is two major versions behind; staying current reduces future migration debt.
- Vite 7 includes performance improvements and the stabilized Environment API.
- Vitest 3.2.4 (already in use) officially supports Vite 7.
- Vite 8 (Rolldown-based) is too aggressive for Electron projects at this time.

## Scope

### In Scope

- Upgrade `vite` from `^5.0.12` to `^7.0.0`
- Upgrade `@vitejs/plugin-react` from `^4.2.1` to `^5.0.0`
- Update SDD documents (`plan.md`, `tasks.md`) to reflect the new dependency versions
- Verify build, dev server, typecheck, lint, and unit tests still pass

### Out of Scope

- Vite 8 / Rolldown migration (Electron ecosystem not ready)
- `build.rollupOptions` → `build.rolldownOptions` rename (V8 only)
- Any feature changes or refactoring

## Breaking Changes Analysis (V5 → V7)

### From Vite 6

| Change | Impact on This Project |
|--------|----------------------|
| `resolve.conditions` default changed | None — not customized |
| `json.stringify` defaults to `'auto'` | None — transparent optimization |
| postcss-load-config v4 → v6 | Low — `tsx` already installed |
| Sass modern API default | None — not using Sass |
| `commonjsOptions.strictRequires` now `true` | None — renderer uses ESM, CJS deps are in main process |
| Extended HTML asset references | None — positive change |
| `tinyglobby` replaces `fast-glob` | None — no range/incremental braces in config |

### From Vite 7

| Change | Impact on This Project |
|--------|----------------------|
| Node.js 20.19+ / 22.12+ required | Compatible — project requires Node >=20 |
| Default browser target → `'baseline-widely-available'` | None — Electron uses Chromium, not affected |
| Removed Sass legacy API | None — not using Sass |
| Removed `splitVendorChunkPlugin` | None — not using it |
| Removed deprecated `transformIndexHtml` hook forms | None — not using custom plugins with these |

## Dependency Compatibility Matrix

| Package | Current | Target | Vite 7 Support |
|---------|---------|--------|----------------|
| vite | 5.4.21 | 7.3.1 | N/A |
| @vitejs/plugin-react | 4.7.0 | 5.2.0 | Peer: `^4.2.0 \|\| ^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0` |
| vitest | 3.2.4 | 3.2.4 (no change) | Officially supported from 3.2 |
| vite-tsconfig-paths | 6.1.1 | 6.1.1 (no change) | Peer: `*` |

## Config File Changes

### `vite.config.ts` — No Changes Required

Current config uses only:
- `plugins: [react()]`
- `base`, `root`, `build.outDir`, `build.emptyOutDir`
- `build.rollupOptions.input` (still supported in V7)
- `resolve.alias`
- `server.port`

All of these are fully supported and unchanged in Vite 7.

### `vitest.config.ts` — No Changes Required

Uses `vitest/config` and `vite-tsconfig-paths`, both compatible.

### `package.json` — 2 Version Bumps

```diff
- "vite": "^5.0.12",
+ "vite": "^7.0.0",
- "@vitejs/plugin-react": "^4.2.1",
+ "@vitejs/plugin-react": "^5.0.0",
```

## Verification Plan

1. `pnpm install` — clean install with updated versions
2. `pnpm run typecheck` — TypeScript compilation
3. `pnpm run lint` — ESLint
4. `pnpm run test:unit` — unit test suite
5. `pnpm run dev:renderer` — dev server starts on port 3000
6. `pnpm run build:renderer` — production build completes

## Risk Assessment

**Overall Risk: Low**

- No config changes required
- No code changes required
- All ecosystem dependencies already support Vite 7
- Electron 29.4.6 is unaffected (Vite serves the renderer, Electron loads the output)
- Rollback is trivial: revert `package.json` and `pnpm install`
