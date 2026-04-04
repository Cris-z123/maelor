# Vite 5 → 7 Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Vite from 5.4.x to 7.3.x and @vitejs/plugin-react from 4.x to 5.x, then update SDD documents to reflect the change.

**Architecture:** Pure dependency upgrade with zero config/code changes. The project's `vite.config.ts` and `vitest.config.ts` use only APIs that are fully supported in Vite 7. SDD documents (`plan.md`, `tasks.md`, `CLAUDE.md`) must be updated to reflect the new dependency version.

**Tech Stack:** Vite 7.3.x, @vitejs/plugin-react 5.2.x, Vitest 3.2.4 (unchanged)

**Design doc:** `docs/plans/2026-04-04-vite-v7-upgrade-design.md`

---

### Task 1: Update SDD Documents Before Code Change

Per CLAUDE.md rule: "Scope changes must update `spec.md`, `plan.md`, and `tasks.md` before code."

**Files:**
- Modify: `specs/003-outlook-pst-mvp/plan.md:13` (Technical Context — Primary Dependencies line)
- Modify: `specs/003-outlook-pst-mvp/tasks.md` (add T038 under Phase 5)
- Modify: `CLAUDE.md:14` (Active Technologies — Vite version)

**Step 1: Update `plan.md` Technical Context**

In `specs/003-outlook-pst-mvp/plan.md`, line 13, change the Primary Dependencies line:

```diff
-**Primary Dependencies**: Electron 29.4.6, React 18, Zustand 4.5, Zod 3.22, Tailwind CSS 3.4, shadcn/ui, better-sqlite3 11.10, openai 4.x, pst-extractor
+**Primary Dependencies**: Electron 29.4.6, React 18, Vite 7, Zustand 4.5, Zod 3.22, Tailwind CSS 3.4, shadcn/ui, better-sqlite3 11.10, openai 4.x, pst-extractor
```

**Step 2: Add task T038 to `tasks.md`**

In `specs/003-outlook-pst-mvp/tasks.md`, add a new task under Phase 5 (after T037):

```markdown
- [ ] T038 [P] Upgrade Vite 5→7 and @vitejs/plugin-react 4→5; verify typecheck, lint, test:unit, and build:renderer
```

**Step 3: Update `CLAUDE.md` Active Technologies**

In `CLAUDE.md`, line 14, change:

```diff
-- React 18 renderer with Vite 5
+- React 18 renderer with Vite 7
```

**Step 4: Commit SDD updates**

```bash
git add specs/003-outlook-pst-mvp/plan.md specs/003-outlook-pst-mvp/tasks.md CLAUDE.md
git commit -m "docs: update SDD documents for Vite 5→7 upgrade (T038)"
```

---

### Task 2: Upgrade Dependencies in package.json

**Files:**
- Modify: `package.json:89-90` (vite and @vitejs/plugin-react version ranges)

**Step 1: Update version ranges in `package.json`**

Change line 68 (`@vitejs/plugin-react`):

```diff
-    "@vitejs/plugin-react": "^4.2.1",
+    "@vitejs/plugin-react": "^5.0.0",
```

Change line 90 (`vite`):

```diff
-    "vite": "^5.0.12",
+    "vite": "^7.0.0",
```

**Step 2: Run pnpm install**

```bash
pnpm install
```

Expected: Installs `vite@7.3.x` and `@vitejs/plugin-react@5.2.x`. No peer dependency warnings for vitest or vite-tsconfig-paths.

**Step 3: Verify installed versions**

```bash
pnpm list vite @vitejs/plugin-react vitest vite-tsconfig-paths --depth 0
```

Expected output should show:
- `vite 7.3.x`
- `@vitejs/plugin-react 5.2.x`
- `vitest 3.2.4` (unchanged)
- `vite-tsconfig-paths 6.1.1` (unchanged)

**Step 4: Commit dependency upgrade**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): upgrade vite 5→7 and @vitejs/plugin-react 4→5"
```

---

### Task 3: Verify Build Toolchain

No file changes — verification only.

**Step 1: Run typecheck**

```bash
pnpm run typecheck
```

Expected: Clean exit with no errors.

**Step 2: Run lint**

```bash
pnpm run lint
```

Expected: Clean exit with no errors.

**Step 3: Run unit tests**

```bash
pnpm run test:unit
```

Expected: All tests pass. Coverage thresholds met (≥80% line, ≥70% branch).

**Step 4: Run renderer build**

```bash
pnpm run build:renderer
```

Expected: `vite build` completes, output in `dist/renderer/`. Both `index.html` and `onboarding.html` entry points present in output.

**Step 5: Run dev server smoke test**

```bash
timeout 10 pnpm run dev:renderer || true
```

Expected: Vite dev server starts on port 3000 without errors. (Will timeout after 10s — that's fine, we just need startup confirmation.)

---

### Task 4: Mark T038 Complete

**Files:**
- Modify: `specs/003-outlook-pst-mvp/tasks.md` (check off T038)

**Step 1: Mark task as done in tasks.md**

```diff
-- [ ] T038 [P] Upgrade Vite 5→7 and @vitejs/plugin-react 4→5; verify typecheck, lint, test:unit, and build:renderer
+- [x] T038 [P] Upgrade Vite 5→7 and @vitejs/plugin-react 4→5; verify typecheck, lint, test:unit, and build:renderer
```

**Step 2: Commit**

```bash
git add specs/003-outlook-pst-mvp/tasks.md
git commit -m "docs: mark T038 Vite upgrade as complete"
```
