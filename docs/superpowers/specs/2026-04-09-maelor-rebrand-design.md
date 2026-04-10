# Maelor Rebrand & UI/UX Upgrade Design

**Date:** 2026-04-09
**Status:** Approved
**Brand tone:** Secure, reliable, a touch of humor
**Visual style:** Modern, clean, distinctive (not generic)

---

## 1. Scope

1. **Brand rename:** mailCopilot → Maelor (all code, config, docs, tests)
2. **Color system upgrade:** "Slate Teal" palette with Amber accent
3. **Dark mode:** Full dark theme with system/light/dark toggle
4. **Menu restructure:** Settings moved to sidebar bottom gear; home shows only core business
5. **UI/UX polish:** Existing features only, icons, semantic colors, dark-adaptive components
6. **Icons & assets:** User-provided, placed in `build/` directory

No new features. No changes to business logic, IPC, or data layer.

---

## 2. Brand Rename

### 2.1 Config files

| File | Change |
|------|--------|
| `package.json:2` | `"name": "maelor"` |
| `package.json:5` | `"description": "Maelor — A secure and reliable email copilot"` |
| `electron-builder.yml:1` | `appId: com.maelor.app` |
| `electron-builder.yml:2` | `productName: Maelor` |
| `electron-builder.yml:51` | `repo: Maelor` |

### 2.2 Main process

| File:Line | Change |
|-----------|--------|
| `src/main/database/Database.ts:16` | `.mailcopilot` → `.maelor` |
| `src/main/error-handler.ts:144` | `'mailCopilot 启动失败'` → `'Maelor 启动失败'` |
| `src/main/error-handler.ts:157` | `'mailCopilot 错误'` → `'Maelor 错误'` |
| `src/main/config/logger.ts:4` | Comment: `mailCopilot` → `Maelor` |
| `src/main/config/logger.ts:47` | `.mailcopilot` → `.maelor` |
| `src/main/electron.d.ts:14,22` | Comments: `mailcopilot` → `maelor` |

### 2.3 Renderer

| File:Line | Change |
|-----------|--------|
| `src/renderer/index.html:11` | `<title>Maelor</title>` |
| `src/renderer/onboarding.html:11` | `<title>Maelor - 初始配置</title>` |
| `src/renderer/app/App.tsx:183` | Brand text → `Maelor` |
| `src/renderer/app/OnboardingFlow.tsx:167` | Brand text → `Maelor` |

### 2.4 Docs & config

- `CLAUDE.md` — all brand references
- `docs/user-interaction-design.md` — all brand references
- `README.md` — brand references + add logo image

### 2.5 Tests

Grep all test files for `mailCopilot` / `mailcopilot` / `MailCopilot` and update.

### 2.6 Not changed

GitHub repo rename is a manual operation by the user in GitHub Settings.

---

## 3. Color System — "Slate Teal"

All values in HSL (shadcn/ui format: `H S% L%` without `hsl()` wrapper).

### 3.1 Light Mode (`:root`)

| Variable | Value | Source |
|----------|-------|--------|
| `--background` | `210 40% 98%` | Slate 50 |
| `--foreground` | `222 47% 11%` | Slate 900 |
| `--card` | `0 0% 100%` | White |
| `--card-foreground` | `222 47% 11%` | Slate 900 |
| `--popover` | `0 0% 100%` | White |
| `--popover-foreground` | `222 47% 11%` | Slate 900 |
| `--primary` | `170 83% 31%` | Teal 600 |
| `--primary-foreground` | `0 0% 100%` | White |
| `--secondary` | `210 40% 96%` | Slate 100 |
| `--secondary-foreground` | `222 47% 11%` | Slate 900 |
| `--muted` | `210 40% 96%` | Slate 100 |
| `--muted-foreground` | `215 16% 47%` | Slate 500 |
| `--accent` | `38 92% 50%` | Amber 500 |
| `--accent-foreground` | `222 47% 11%` | Slate 900 |
| `--destructive` | `0 84% 60%` | Red 500 |
| `--destructive-foreground` | `0 0% 100%` | White |
| `--border` | `214 32% 91%` | Slate 200 |
| `--input` | `214 32% 91%` | Slate 200 |
| `--ring` | `170 83% 31%` | Teal 600 |
| `--radius` | `1rem` | Unchanged |
| `--warning` | `25 95% 53%` | Orange 500 |
| `--warning-foreground` | `0 0% 100%` | White |
| `--success` | `160 84% 39%` | Emerald 500 |
| `--success-foreground` | `0 0% 100%` | White |

### 3.2 Dark Mode (`.dark`)

| Variable | Value | Source |
|----------|-------|--------|
| `--background` | `222 47% 11%` | Slate 900 |
| `--foreground` | `210 40% 98%` | Slate 100 |
| `--card` | `217 33% 17%` | Slate 800 |
| `--card-foreground` | `210 40% 98%` | Slate 100 |
| `--popover` | `217 33% 17%` | Slate 800 |
| `--popover-foreground` | `210 40% 98%` | Slate 100 |
| `--primary` | `171 77% 64%` | Teal 400 |
| `--primary-foreground` | `222 47% 11%` | Slate 900 |
| `--secondary` | `217 19% 27%` | Slate 700 |
| `--secondary-foreground` | `210 40% 98%` | Slate 100 |
| `--muted` | `217 19% 27%` | Slate 700 |
| `--muted-foreground` | `215 20% 65%` | Slate 400 |
| `--accent` | `43 96% 56%` | Amber 400 |
| `--accent-foreground` | `222 47% 11%` | Slate 900 |
| `--destructive` | `0 91% 71%` | Red 400 |
| `--destructive-foreground` | `0 0% 100%` | White |
| `--border` | `217 19% 27%` | Slate 700 |
| `--input` | `217 19% 27%` | Slate 700 |
| `--ring` | `171 77% 64%` | Teal 400 |
| `--warning` | `27 96% 61%` | Orange 400 |
| `--warning-foreground` | `222 47% 11%` | Slate 900 |
| `--success` | `160 84% 45%` | Emerald 400 |
| `--success-foreground` | `222 47% 11%` | Slate 900 |

### 3.3 Tailwind config changes

- Remove `brand.blue` and `brand.cyan`
- Add `warning` and `success` color tokens referencing CSS variables
- `darkMode: ['class']` already configured, no change needed

---

## 4. Dark Mode Infrastructure

### 4.1 Theme toggle

- New `useTheme` hook: manages `system` | `light` | `dark`
- Persists to `localStorage` key `maelor-theme`
- Default: `system` (follows `prefers-color-scheme`)
- Applies `class="dark"` on `<html>` element

### 4.2 Settings page "Appearance" section

- New section in settings view with three radio options: 系统 / 浅色 / 深色
- Positioned before the existing "保存更改" section

### 4.3 globals.css changes

- `html` rule: `bg-slate-100` → `bg-background`
- `body` rule: `bg-slate-100 text-slate-900` → `bg-background text-foreground`

---

## 5. UI/UX Component Upgrades

### 5.1 Sidebar restructure

**Brand area (top):**
- Logo SVG from `src/renderer/assets/logo.svg` (text placeholder "Maelor" until icon provided)
- "Maelor" text, no subtitle

**Navigation:**
- "审阅" (was "最新结果") with `FileSearch` icon from lucide-react — `activeTab: 'latest'`
- "历史" (was "历史运行") with `History` icon — `activeTab: 'history'`
- Active state: `bg-primary text-primary-foreground` (was `bg-slate-900 text-white`)
- Hover state: `hover:bg-muted` (was `hover:bg-slate-100`)

**Bottom area (fixed):**
- Settings gear icon (`Settings` from lucide-react), triggers `activeTab: 'settings'`
- Version number display (read from `electron` `app.getVersion()` via IPC, or hardcoded `2.0.3` as fallback)

**Dark adaptation:**
- `bg-white` → `bg-card`
- `border-slate-200` → `border-border`

### 5.2 Header

- Tab titles renamed: "最新结果" → "审阅", "历史运行" → "历史"
- "立即扫描" button: `bg-blue-600` → `bg-primary hover:bg-primary/90`
- "刷新" button: semantic border/text colors
- Header background: `bg-white` → `bg-card`

### 5.3 Summary Cards

- Add lucide-react icons: `Clock` (scan time), `FileText` (PST count), `Mail` (email count), `AlertTriangle` (items/review)
- `bg-white` → `bg-card`
- Left border decoration: `border-l-4 border-primary/20`

### 5.4 Run Item List

- `bg-white` → `bg-card`
- Selected state: `border-blue-600` → `border-primary`
- Low-confidence background: keep `bg-yellow-50`, add `dark:bg-yellow-950/30`

### 5.5 Run Detail Panel

- `bg-white` → `bg-card`
- Text colors → semantic variables

### 5.6 Evidence List

- `bg-slate-50` → `bg-muted`
- Text/border → semantic variables

### 5.7 runFormatting.ts dark variants

| Current | Add |
|---------|-----|
| `bg-emerald-50 text-emerald-700` | `dark:bg-emerald-950/30 dark:text-emerald-400` |
| `bg-amber-50 text-amber-700` | `dark:bg-amber-950/30 dark:text-amber-400` |
| `bg-yellow-100 text-yellow-800` | `dark:bg-yellow-950/30 dark:text-yellow-400` |
| `bg-blue-50 text-blue-700` | `dark:bg-blue-950/30 dark:text-blue-400` |
| `bg-slate-100 text-slate-700` | `dark:bg-slate-800 dark:text-slate-300` |

### 5.8 Settings page

- Triggered from sidebar bottom gear (not main nav)
- Layout unchanged (Outlook directory / AI config / data management)
- Input focus: `focus:border-blue-600` → `focus:border-primary`
- Section cards: `bg-white` → `bg-card`
- "保存设置" button: `bg-slate-900` → `bg-primary`
- New "外观" (Appearance) section with theme toggle

### 5.9 Onboarding

- Brand text → "Maelor"
- Step indicator: `border-blue-600 bg-blue-600` → `border-primary bg-primary`
- All buttons: `bg-blue-600` → `bg-primary`
- Cards/backgrounds → semantic variables
- Flow logic unchanged

### 5.10 History table

- `bg-white` → `bg-card`
- `bg-slate-50` (thead) → `bg-muted`
- Text → `text-foreground` / `text-muted-foreground`

### 5.11 Global replacements

All component files:
- `text-slate-900` → `text-foreground`
- `text-slate-500` / `text-slate-600` → `text-muted-foreground`
- `border-slate-200` → `border-border`
- `bg-slate-100` (global background) → `bg-background`
- Status message bar: `bg-white` → `bg-card`

---

## 6. Icons & Assets

### 6.1 Build icons (user-provided, placed in `build/`)

| File | Purpose |
|------|---------|
| `build/icon.ico` | Windows installer icon (16/32/48/64/128/256px) |
| `build/icon.png` | Universal fallback, 512x512 or 1024x1024 |
| `build/icon.icns` | macOS icon (if needed) |

### 6.2 App icons (created in `src/renderer/assets/`)

| File | Purpose |
|------|---------|
| `src/renderer/assets/logo.svg` | Sidebar brand identity |
| `src/renderer/assets/logo-icon.svg` | Small icon (favicon, loading) |

### 6.3 README

- Add logo image reference at the top of `README.md`

---

## 7. Docs Update

- `docs/user-interaction-design.md` — all "mailCopilot" → "Maelor", update color system section, add dark mode colors, update menu structure
- `CLAUDE.md` — all brand references
- `README.md` — brand references + logo

---

## 8. Execution Order

1. Create branch `feature/maelor-rebrand`
2. **Phase 1: Brand rename** — pure text replacements across config, code, docs, tests
3. **Phase 2: Color system + dark mode** — `globals.css` `:root` + `.dark`, `tailwind.config.js`, `useTheme` hook, settings appearance section
4. **Phase 3: UI/UX component upgrades** — sidebar restructure, icons, semantic colors, dark adaptation for all components
5. **Phase 4: Docs update** — design doc, CLAUDE.md, README logo
6. **Phase 5: Icons** — when user provides files, place in directories

---

## 9. Verification

1. `pnpm run typecheck` — passes
2. `pnpm run lint` — passes
3. `pnpm run test:unit` — passes
4. Manual verification:
   - All brand text shows "Maelor"
   - Teal primary color active
   - Dark mode toggle works (system/light/dark)
   - Sidebar: "审阅" + "历史" nav, bottom gear for settings
   - Icons load correctly (when provided)

---

## 10. Files Affected

**Config:** `package.json`, `electron-builder.yml`, `tailwind.config.js`

**Main process:** `src/main/database/Database.ts`, `src/main/error-handler.ts`, `src/main/config/logger.ts`, `src/main/electron.d.ts`

**Renderer styles:** `src/renderer/styles/globals.css`

**Renderer views:** `src/renderer/index.html`, `src/renderer/onboarding.html`, `src/renderer/app/App.tsx`, `src/renderer/app/OnboardingFlow.tsx`

**Renderer components:** `src/renderer/components/runs/RunSummaryCards.tsx`, `src/renderer/components/runs/RunItemList.tsx`, `src/renderer/components/runs/RunDetailPanel.tsx`, `src/renderer/components/runs/EvidenceList.tsx`, `src/renderer/components/runs/LatestRunReview.tsx`, `src/renderer/components/runs/runFormatting.ts`

**New files:** `src/renderer/hooks/useTheme.ts`, `src/renderer/assets/logo.svg` (placeholder), `src/renderer/assets/logo-icon.svg` (placeholder)

**Docs:** `docs/user-interaction-design.md`, `CLAUDE.md`, `README.md`

**Tests:** Any test files containing brand references (grep to identify)
