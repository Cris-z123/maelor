# Maelor Rebrand & UI/UX Upgrade — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename mailCopilot to Maelor, introduce a Slate Teal color system with dark mode, restructure the sidebar, and polish all existing UI components.

**Architecture:** Pure frontend/config rebrand — no business logic, IPC, or data layer changes. CSS variables (HSL, shadcn/ui format) drive the color system. A `useTheme` hook manages dark mode with localStorage persistence. Sidebar nav shrinks to 2 items + bottom gear for settings.

**Tech Stack:** Electron 29.4.6, React 18, TypeScript 5.4, Tailwind CSS 3.4, shadcn/ui CSS variables, lucide-react icons, Vite 7.

---

## File Structure

### Files to modify

| File | Responsibility |
|------|---------------|
| `package.json` | App name, description |
| `electron-builder.yml` | App ID, product name, repo |
| `src/main/database/Database.ts` | Data directory name |
| `src/main/error-handler.ts` | Dialog titles |
| `src/main/config/logger.ts` | Log directory, comments |
| `src/main/electron.d.ts` | Type doc comments |
| `src/renderer/index.html` | Page title |
| `src/renderer/onboarding.html` | Page title |
| `src/renderer/styles/globals.css` | CSS variables (light + dark) |
| `tailwind.config.js` | Color tokens, remove old brand colors |
| `src/renderer/app/App.tsx` | Sidebar, header, settings, history — full layout |
| `src/renderer/app/OnboardingFlow.tsx` | Brand text, step colors, button colors |
| `src/renderer/components/runs/RunSummaryCards.tsx` | Icons, semantic colors |
| `src/renderer/components/runs/RunItemList.tsx` | Semantic colors, dark variants |
| `src/renderer/components/runs/RunDetailPanel.tsx` | Semantic colors |
| `src/renderer/components/runs/EvidenceList.tsx` | Semantic colors |
| `src/renderer/components/runs/LatestRunReview.tsx` | Button color |
| `src/renderer/components/runs/runFormatting.ts` | Dark variant classes |
| `CLAUDE.md` | Brand reference |
| `README.md` | Brand, logo, badges |
| `docs/user-interaction-design.md` | Brand, colors, menu structure |
| `tests/setup.ts` | Brand reference in path |
| `tests/unit/main/database/Database.test.ts` | `.mailcopilot` path assertions |
| `tests/unit/main/error-handler.test.ts` | Dialog title assertions |
| `tests/unit/main/database/schema.test.ts` | Path constant |
| `tests/unit/main/onboarding/OnboardingManager.test.ts` | Temp dir prefix |
| `tests/unit/main/onboarding/PstDiscovery.test.ts` | Temp dir prefix |
| `tests/unit/main/app.test.ts` | Exe name in test |
| `tests/integration/ipc/runs.settings.test.ts` | Path in fixture data |

### Files to create

| File | Responsibility |
|------|---------------|
| `src/renderer/hooks/useTheme.ts` | Theme state management (system/light/dark), localStorage, class toggle |
| `src/renderer/assets/logo.svg` | Placeholder SVG logo for sidebar |

---

## Task 1: Brand Rename — Config Files

**Files:**
- Modify: `package.json:2,5`
- Modify: `electron-builder.yml:1,2,51`

- [x] **Step 1: Update package.json**

```json
// line 2: change name
"name": "maelor",
// line 5: change description
"description": "Maelor — A secure and reliable email copilot",
```

In `package.json`, replace line 2 `"name": "mailcopilot"` with `"name": "maelor"` and line 5 `"description": "Windows-only Outlook PST direct-connect MVP"` with `"description": "Maelor — A secure and reliable email copilot"`.

- [x] **Step 2: Update electron-builder.yml**

Replace these three lines:
```yaml
# line 1
appId: com.maelor.app
# line 2
productName: Maelor
# line 51 (inside publish section)
    repo: Maelor
```

- [x] **Step 3: Verify no remaining references**

Run: `grep -r "mailcopilot\|mailCopilot\|MailCopilot" package.json electron-builder.yml`
Expected: no matches.

- [x] **Step 4: Commit**

```bash
git add package.json electron-builder.yml
git commit -m "chore: rename mailCopilot to Maelor in config files"
```

---

## Task 2: Brand Rename — Main Process

**Files:**
- Modify: `src/main/database/Database.ts:16`
- Modify: `src/main/error-handler.ts:144,157`
- Modify: `src/main/config/logger.ts:4,47`
- Modify: `src/main/electron.d.ts:14,22`

- [x] **Step 1: Update Database.ts**

In `src/main/database/Database.ts`, line 16:
```typescript
// before
const dataDir = path.join(userDataPath, '.mailcopilot');
// after
const dataDir = path.join(userDataPath, '.maelor');
```

- [x] **Step 2: Update error-handler.ts**

In `src/main/error-handler.ts`:
```typescript
// line 144: before
dialog.showErrorBox('mailCopilot 启动失败', this.buildStartupFailureMessage(startupError));
// line 144: after
dialog.showErrorBox('Maelor 启动失败', this.buildStartupFailureMessage(startupError));

// line 157: before
dialog.showErrorBox('mailCopilot 错误', message);
// line 157: after
dialog.showErrorBox('Maelor 错误', message);
```

- [x] **Step 3: Update logger.ts**

In `src/main/config/logger.ts`:
```typescript
// line 4: before
 * Structured logging for mailCopilot application
// line 4: after
 * Structured logging for Maelor application

// line 47: before
const logsDir = path.join(app.getPath('userData'), '.mailcopilot', 'logs');
// line 47: after
const logsDir = path.join(app.getPath('userData'), '.maelor', 'logs');
```

- [x] **Step 4: Update electron.d.ts**

In `src/main/electron.d.ts`, lines 14 and 22:
```typescript
// before (both lines)
 * @param service - Service name (e.g., 'mailcopilot')
// after (both lines)
 * @param service - Service name (e.g., 'maelor')
```

- [x] **Step 5: Verify**

Run: `grep -r "mailcopilot\|mailCopilot\|MailCopilot" src/main/`
Expected: no matches.

- [x] **Step 6: Commit**

```bash
git add src/main/
git commit -m "chore: rename mailCopilot to Maelor in main process"
```

---

## Task 3: Brand Rename — Renderer

**Files:**
- Modify: `src/renderer/index.html:11`
- Modify: `src/renderer/onboarding.html:11`
- Modify: `src/renderer/app/App.tsx:183`
- Modify: `src/renderer/app/OnboardingFlow.tsx:167`

- [x] **Step 1: Update index.html**

```html
<!-- before -->
<title>mailCopilot - 智能邮件助手</title>
<!-- after -->
<title>Maelor</title>
```

- [x] **Step 2: Update onboarding.html**

```html
<!-- before -->
<title>MailCopilot - Setup Wizard</title>
<!-- after -->
<title>Maelor - 初始配置</title>
```

- [x] **Step 3: Update App.tsx brand text**

In `src/renderer/app/App.tsx`, line 183:
```tsx
// before
                            mailCopilot
// after
                            Maelor
```

- [x] **Step 4: Update OnboardingFlow.tsx brand text**

In `src/renderer/app/OnboardingFlow.tsx`, line 167:
```tsx
// before
                            mailCopilot
// after
                            Maelor
```

- [x] **Step 5: Verify**

Run: `grep -r "mailcopilot\|mailCopilot\|MailCopilot" src/renderer/`
Expected: no matches.

- [x] **Step 6: Commit**

```bash
git add src/renderer/
git commit -m "chore: rename mailCopilot to Maelor in renderer"
```

---

## Task 4: Brand Rename — Tests

**Files:**
- Modify: `tests/setup.ts:200`
- Modify: `tests/unit/main/database/Database.test.ts:54,57,62,69`
- Modify: `tests/unit/main/error-handler.test.ts:58,94`
- Modify: `tests/unit/main/database/schema.test.ts:21`
- Modify: `tests/unit/main/onboarding/OnboardingManager.test.ts:27`
- Modify: `tests/unit/main/onboarding/PstDiscovery.test.ts:21`
- Modify: `tests/unit/main/app.test.ts:68`
- Modify: `tests/integration/ipc/runs.settings.test.ts:77,142`

- [x] **Step 1: Update tests/setup.ts**

```typescript
// line 200: before
                return '/tmp/test-mailcopilot';
// after
                return '/tmp/test-maelor';
```

- [x] **Step 2: Update Database.test.ts**

Replace all `.mailcopilot` with `.maelor` in path assertions:
```typescript
// line 54
expect(fs.mkdirSync).toHaveBeenCalledWith('D:\\userData\\.maelor', {
// line 57
expect(databaseCtor).toHaveBeenCalledWith('D:\\userData\\.maelor\\app.db', {
// line 62
expect(DatabaseManager.getPath()).toBe('D:\\userData\\.maelor\\app.db');
// line 69
            'D:\\userData\\.maelor\\app.db';
```

- [x] **Step 3: Update error-handler.test.ts**

```typescript
// line 58: before
expect(showErrorBox).toHaveBeenCalledWith('mailCopilot 启动失败', expect.any(String));
// after
expect(showErrorBox).toHaveBeenCalledWith('Maelor 启动失败', expect.any(String));

// line 94: before
expect(showErrorBox).toHaveBeenCalledWith('mailCopilot 错误', expect.any(String));
// after
expect(showErrorBox).toHaveBeenCalledWith('Maelor 错误', expect.any(String));
```

- [x] **Step 4: Update schema.test.ts**

```typescript
// line 21: before
const DB_PATH = 'C:\\Users\\tester\\AppData\\Roaming\\mailCopilot\\app.db';
// after
const DB_PATH = 'C:\\Users\\tester\\AppData\\Roaming\\Maelor\\app.db';
```

- [x] **Step 5: Update OnboardingManager.test.ts and PstDiscovery.test.ts**

```typescript
// OnboardingManager.test.ts line 27: before
tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mailcopilot-onboarding-'));
// after
tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'maelor-onboarding-'));

// PstDiscovery.test.ts line 21: before
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mailcopilot-pst-'));
// after
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'maelor-pst-'));
```

- [x] **Step 6: Update app.test.ts**

```typescript
// line 68: before
secondInstanceHandler?.({} as Electron.Event, ['mailCopilot.exe'], 'D:\\work');
// after
secondInstanceHandler?.({} as Electron.Event, ['Maelor.exe'], 'D:\\work');
```

- [x] **Step 7: Update runs.settings.test.ts**

```typescript
// lines 77 and 142: before
databasePath: 'D:\\mailCopilot\\mailcopilot.db',
// after
databasePath: 'D:\\Maelor\\maelor.db',
```

- [x] **Step 8: Run tests**

Run: `pnpm run test:unit`
Expected: all tests pass.

- [x] **Step 9: Commit**

```bash
git add tests/
git commit -m "chore: rename mailCopilot to Maelor in test files"
```

---

## Task 5: Brand Rename — Docs

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`
- Modify: `docs/user-interaction-design.md`

- [x] **Step 1: Update CLAUDE.md**

Replace `mailCopilot` with `Maelor` in the title line:
```markdown
<!-- before -->
# mailCopilot Development Guidelines
<!-- after -->
# Maelor Development Guidelines
```

- [x] **Step 2: Update README.md header and content**

Replace the entire header section:
```markdown
<!-- before -->
# mailCopilot

> 智能邮件处理助手 - Email Item Traceability & Verification System

<!-- after -->
<p align="center">
  <img src="build/icon.png" alt="Maelor" width="128" />
</p>

<h1 align="center">Maelor</h1>

<p align="center">A secure and reliable email copilot</p>
```

Then replace all remaining `mailCopilot` / `mailcopilot` references throughout the file:
- Line 6: badge URL `mailcopilot-coverage.json` → `maelor-coverage.json`
- Line 13: project description — rewrite to reference "Maelor"
- Line 175: issues URL

- [x] **Step 3: Update docs/user-interaction-design.md**

Replace all `mailCopilot` / `mailcopilot` references with `Maelor` / `maelor` throughout the file. This is a bulk find-replace.

- [x] **Step 4: Verify**

Run: `grep -ri "mailcopilot" CLAUDE.md README.md docs/`
Expected: no matches (or only in file paths referencing the old GitHub repo which is expected during transition).

- [x] **Step 5: Commit**

```bash
git add CLAUDE.md README.md docs/
git commit -m "docs: rename mailCopilot to Maelor across all documentation"
```

---

## Task 6: Color System + Dark Mode CSS Variables

**Files:**
- Modify: `src/renderer/styles/globals.css`
- Modify: `tailwind.config.js`

- [x] **Step 1: Replace globals.css color variables and base styles**

Replace the entire `@layer base` block in `src/renderer/styles/globals.css`:

```css
@layer base {
    :root {
        --background: 210 40% 98%;
        --foreground: 222 47% 11%;
        --card: 0 0% 100%;
        --card-foreground: 222 47% 11%;
        --popover: 0 0% 100%;
        --popover-foreground: 222 47% 11%;
        --primary: 170 83% 31%;
        --primary-foreground: 0 0% 100%;
        --secondary: 210 40% 96%;
        --secondary-foreground: 222 47% 11%;
        --muted: 210 40% 96%;
        --muted-foreground: 215 16% 47%;
        --accent: 38 92% 50%;
        --accent-foreground: 222 47% 11%;
        --destructive: 0 84% 60%;
        --destructive-foreground: 0 0% 100%;
        --border: 214 32% 91%;
        --input: 214 32% 91%;
        --ring: 170 83% 31%;
        --radius: 1rem;
        --warning: 25 95% 53%;
        --warning-foreground: 0 0% 100%;
        --success: 160 84% 39%;
        --success-foreground: 0 0% 100%;
    }

    .dark {
        --background: 222 47% 11%;
        --foreground: 210 40% 98%;
        --card: 217 33% 17%;
        --card-foreground: 210 40% 98%;
        --popover: 217 33% 17%;
        --popover-foreground: 210 40% 98%;
        --primary: 171 77% 64%;
        --primary-foreground: 222 47% 11%;
        --secondary: 217 19% 27%;
        --secondary-foreground: 210 40% 98%;
        --muted: 217 19% 27%;
        --muted-foreground: 215 20% 65%;
        --accent: 43 96% 56%;
        --accent-foreground: 222 47% 11%;
        --destructive: 0 91% 71%;
        --destructive-foreground: 0 0% 100%;
        --border: 217 19% 27%;
        --input: 217 19% 27%;
        --ring: 171 77% 64%;
        --warning: 27 96% 61%;
        --warning-foreground: 222 47% 11%;
        --success: 160 84% 45%;
        --success-foreground: 222 47% 11%;
    }

    * {
        @apply border-border;
        box-sizing: border-box;
    }

    html {
        @apply bg-background;
    }

    body {
        @apply m-0 bg-background text-foreground;
        font-family:
            'Inter',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        font-family:
            'Inter',
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
        letter-spacing: -0.02em;
    }

    code,
    pre,
    .font-mono {
        font-family: 'JetBrains Mono', Consolas, monospace;
    }

    button,
    input,
    textarea,
    select {
        font: inherit;
    }

    #root {
        min-height: 100vh;
    }
}
```

- [x] **Step 2: Update tailwind.config.js**

Remove old `brand` colors and add `warning` and `success` tokens. Replace the `colors` section inside `theme.extend`:

```javascript
            colors: {
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                warning: {
                    DEFAULT: 'hsl(var(--warning))',
                    foreground: 'hsl(var(--warning-foreground))',
                },
                success: {
                    DEFAULT: 'hsl(var(--success))',
                    foreground: 'hsl(var(--success-foreground))',
                },
                'low-confidence': '#FFFBE6',
            },
```

- [x] **Step 3: Verify build**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/styles/globals.css tailwind.config.js
git commit -m "feat: introduce Slate Teal color system with dark mode CSS variables"
```

---

## Task 7: Dark Mode Infrastructure — useTheme Hook

**Files:**
- Create: `src/renderer/hooks/useTheme.ts`

- [x] **Step 1: Create hooks directory and useTheme.ts**

Create `src/renderer/hooks/useTheme.ts`:

```typescript
import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'maelor-theme';

function getStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
    } catch {
        // localStorage unavailable
    }
    return 'system';
}

function applyTheme(theme: Theme): void {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else if (theme === 'light') {
        root.classList.remove('dark');
    } else {
        // system
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', prefersDark);
    }
}

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>(getStoredTheme);

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => applyTheme('system');
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [theme]);

    function setTheme(next: Theme): void {
        setThemeState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // localStorage unavailable
        }
    }

    return { theme, setTheme } as const;
}
```

- [x] **Step 2: Verify typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/hooks/useTheme.ts
git commit -m "feat: add useTheme hook for dark mode management"
```

---

## Task 8: Sidebar Restructure + Theme Integration in App.tsx

**Files:**
- Modify: `src/renderer/app/App.tsx`

This is the largest single task. It restructures the sidebar, renames tabs, moves settings to bottom gear, integrates useTheme, and replaces all hardcoded colors with semantic tokens.

- [x] **Step 1: Rewrite App.tsx**

Replace the entire content of `src/renderer/app/App.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { FileSearch, History, Settings } from 'lucide-react';

import type { RunDetail, RunSummary, SettingsView } from '@shared/types/app';

import LatestRunReview from '@renderer/components/runs/LatestRunReview';
import OnboardingFlow from './OnboardingFlow';
import { appApi } from './appApi';
import { useTheme } from '@renderer/hooks/useTheme';

type TabKey = 'latest' | 'history' | 'settings';

const navItems: Array<{ key: Exclude<TabKey, 'settings'>; label: string; icon: typeof FileSearch }> = [
    { key: 'latest', label: '审阅', icon: FileSearch },
    { key: 'history', label: '历史', icon: History },
];

const tabTitles: Record<TabKey, { title: string; description: string }> = {
    latest: { title: '审阅', description: '手动触发扫描，审阅本次提取结果与来源证据。' },
    history: { title: '历史', description: '查看最近 20 次运行记录。' },
    settings: { title: '设置', description: '管理 Outlook、AI 配置和数据。' },
};

const emptySettings: SettingsView = {
    outlookDirectory: '',
    aiBaseUrl: '',
    aiModel: '',
    databasePath: '',
    databaseSizeBytes: 0,
};

function formatDate(timestamp: number | null): string {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
}

export default function App() {
    const [activeTab, setActiveTab] = useState<TabKey>('latest');
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [latestRun, setLatestRun] = useState<RunDetail | null>(null);
    const [recentRuns, setRecentRuns] = useState<RunSummary[]>([]);
    const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [settings, setSettings] = useState<SettingsView>(emptySettings);
    const [settingsApiKey, setSettingsApiKey] = useState('');
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        void refreshAppState();
    }, []);

    useEffect(() => {
        const currentRun = selectedRun ?? latestRun;
        setSelectedItemId(currentRun?.items[0]?.itemId ?? null);
    }, [latestRun, selectedRun]);

    async function refreshAppState(): Promise<void> {
        setLoading(true);

        try {
            const status = await appApi.getOnboardingStatus();
            setConfigured(status.completed);

            if (!status.completed) {
                setLatestRun(null);
                setRecentRuns([]);
                setSelectedRun(null);
                return;
            }

            const [latest, recent, settingsSummary] = await Promise.all([
                appApi.getLatestRun(),
                appApi.listRecentRuns(),
                appApi.getSettingsSummary(),
            ]);

            setLatestRun(latest);
            setRecentRuns(recent);
            setSettings(settingsSummary);
        } finally {
            setLoading(false);
        }
    }

    async function handleStartRun(): Promise<void> {
        setLoading(true);
        setStatusMessage(null);

        try {
            const result = await appApi.startRun();
            setStatusMessage(result.message);
            await refreshAppState();
        } finally {
            setLoading(false);
        }
    }

    async function handleOpenRun(runId: string): Promise<void> {
        setLoading(true);

        try {
            const detail = await appApi.getRunById(runId);
            setSelectedRun(detail);
            setActiveTab('latest');
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveSettings(): Promise<void> {
        setLoading(true);
        setStatusMessage(null);

        try {
            const success = await appApi.updateSettings({
                outlookDirectory: settings.outlookDirectory,
                aiBaseUrl: settings.aiBaseUrl,
                aiModel: settings.aiModel,
                apiKey: settingsApiKey || undefined,
            });

            setStatusMessage(success ? '设置已保存。' : '设置保存失败。');
            await refreshAppState();
            setSettingsApiKey('');
        } finally {
            setLoading(false);
        }
    }

    async function handleClearRuns(): Promise<void> {
        if (!window.confirm('确定要清理所有历史运行记录吗？此操作不可撤销。')) {
            return;
        }

        setLoading(true);
        setStatusMessage(null);

        try {
            const result = await appApi.clearRuns();
            setStatusMessage(
                result.success
                    ? `已清理 ${result.deletedRunCount} 次运行记录。`
                    : '运行记录清理失败。',
            );
            await refreshAppState();
        } finally {
            setLoading(false);
        }
    }

    async function handleRebuildIndex(): Promise<void> {
        setLoading(true);
        setStatusMessage(null);

        try {
            const result = await appApi.rebuildIndex();
            setStatusMessage(result.message);
            await refreshAppState();
        } finally {
            setLoading(false);
        }
    }

    async function copySearchTerm(searchTerm: string): Promise<void> {
        await navigator.clipboard.writeText(searchTerm);
        setStatusMessage('搜索词已复制。');
    }

    if (configured === null) {
        return (
            <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
                正在加载...
            </div>
        );
    }

    if (!configured) {
        return <OnboardingFlow embedded onCompleted={() => void refreshAppState()} />;
    }

    const run = selectedRun ?? latestRun;
    const currentTab = tabTitles[activeTab];

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)]">
                <aside className="flex flex-col border-r border-border bg-card px-5 py-6">
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">Maelor</h1>
                    </div>

                    <nav className="mt-10 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.key}
                                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                                        activeTab === item.key
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                    onClick={() => setActiveTab(item.key)}
                                    type="button"
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>

                    <div className="mt-auto space-y-2">
                        <button
                            className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                                activeTab === 'settings'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                            onClick={() => setActiveTab('settings')}
                            type="button"
                        >
                            <Settings className="h-4 w-4" />
                            设置
                        </button>
                        <div className="px-4 text-xs text-muted-foreground">v2.0.3</div>
                    </div>
                </aside>

                <main className="flex min-h-screen flex-col">
                    <header className="flex items-center justify-between border-b border-border bg-card px-8 py-5">
                        <div>
                            <h2 className="text-xl font-semibold text-foreground">
                                {currentTab.title}
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {currentTab.description}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {activeTab === 'latest' && (
                                <>
                                    <button
                                        className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                                        disabled={loading}
                                        onClick={() => void refreshAppState()}
                                        type="button"
                                    >
                                        刷新
                                    </button>
                                    <button
                                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={loading}
                                        onClick={() => {
                                            void handleStartRun();
                                        }}
                                        type="button"
                                    >
                                        立即扫描
                                    </button>
                                </>
                            )}
                        </div>
                    </header>

                    <div className="flex-1 px-8 py-6">
                        {statusMessage && (
                            <div className="mb-6 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground shadow-sm">
                                {statusMessage}
                            </div>
                        )}

                        {activeTab === 'latest' && (
                            <LatestRunReview
                                onCopySearchTerm={(searchTerm) => {
                                    void copySearchTerm(searchTerm);
                                }}
                                onSelectItem={setSelectedItemId}
                                onStartRun={() => {
                                    void handleStartRun();
                                }}
                                run={run}
                                selectedItemId={selectedItemId}
                            />
                        )}

                        {activeTab === 'history' && (
                            <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                                <table className="min-w-full divide-y divide-border text-sm">
                                    <thead className="bg-muted text-left text-muted-foreground">
                                        <tr>
                                            <th className="px-5 py-4 font-medium">时间</th>
                                            <th className="px-5 py-4 font-medium">PST 数</th>
                                            <th className="px-5 py-4 font-medium">邮件数</th>
                                            <th className="px-5 py-4 font-medium">事项数</th>
                                            <th className="px-5 py-4 font-medium">状态</th>
                                            <th className="px-5 py-4 font-medium">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border bg-card">
                                        {recentRuns.length === 0 && (
                                            <tr>
                                                <td
                                                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                                                    colSpan={6}
                                                >
                                                    还没有历史运行记录。
                                                </td>
                                            </tr>
                                        )}
                                        {recentRuns.map((runSummary) => (
                                            <tr key={runSummary.runId}>
                                                <td className="px-5 py-4 text-foreground">
                                                    {formatDate(runSummary.startedAt)}
                                                </td>
                                                <td className="px-5 py-4 text-foreground">
                                                    {runSummary.pstCount}
                                                </td>
                                                <td className="px-5 py-4 text-foreground">
                                                    {runSummary.processedEmailCount}
                                                </td>
                                                <td className="px-5 py-4 text-foreground">
                                                    {runSummary.itemCount}
                                                </td>
                                                <td className="px-5 py-4 text-foreground">
                                                    {runSummary.status}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
                                                        onClick={() => {
                                                            void handleOpenRun(runSummary.runId);
                                                        }}
                                                        type="button"
                                                    >
                                                        查看详情
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="grid gap-6 xl:grid-cols-2">
                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Outlook 目录
                                    </h3>
                                    <label className="mt-4 block text-sm text-foreground">
                                        <span className="mb-2 block font-medium">数据目录</span>
                                        <input
                                            className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                                            onChange={(event) =>
                                                setSettings((current) => ({
                                                    ...current,
                                                    outlookDirectory: event.target.value,
                                                }))
                                            }
                                            value={settings.outlookDirectory}
                                        />
                                    </label>
                                </section>

                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        AI 配置
                                    </h3>
                                    <div className="mt-4 space-y-4">
                                        <label className="block text-sm text-foreground">
                                            <span className="mb-2 block font-medium">
                                                API Base URL
                                            </span>
                                            <input
                                                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                                                onChange={(event) =>
                                                    setSettings((current) => ({
                                                        ...current,
                                                        aiBaseUrl: event.target.value,
                                                    }))
                                                }
                                                value={settings.aiBaseUrl}
                                            />
                                        </label>
                                        <label className="block text-sm text-foreground">
                                            <span className="mb-2 block font-medium">Model</span>
                                            <input
                                                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                                                onChange={(event) =>
                                                    setSettings((current) => ({
                                                        ...current,
                                                        aiModel: event.target.value,
                                                    }))
                                                }
                                                value={settings.aiModel}
                                            />
                                        </label>
                                        <label className="block text-sm text-foreground">
                                            <span className="mb-2 block font-medium">
                                                新的 API Key
                                            </span>
                                            <input
                                                className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-primary"
                                                onChange={(event) =>
                                                    setSettingsApiKey(event.target.value)
                                                }
                                                placeholder="不修改可留空"
                                                type="password"
                                                value={settingsApiKey}
                                            />
                                        </label>
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        外观
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        选择应用的显示主题。
                                    </p>
                                    <div className="mt-4 flex gap-3">
                                        {([
                                            { value: 'system', label: '系统' },
                                            { value: 'light', label: '浅色' },
                                            { value: 'dark', label: '深色' },
                                        ] as const).map((option) => (
                                            <button
                                                key={option.value}
                                                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                                                    theme === option.value
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'border border-border text-foreground hover:bg-muted'
                                                }`}
                                                onClick={() => setTheme(option.value)}
                                                type="button"
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        数据管理
                                    </h3>
                                    <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
                                        <div>
                                            <dt className="font-medium text-foreground">
                                                数据库位置
                                            </dt>
                                            <dd className="mt-1 break-all font-mono text-xs">
                                                {settings.databasePath || '-'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="font-medium text-foreground">
                                                数据库大小
                                            </dt>
                                            <dd className="mt-1">
                                                {Math.max(
                                                    0,
                                                    Math.round(settings.databaseSizeBytes / 1024),
                                                )}{' '}
                                                KB
                                            </dd>
                                        </div>
                                    </dl>
                                    <div className="mt-5 flex flex-wrap gap-3">
                                        <button
                                            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                                            onClick={() => {
                                                void handleRebuildIndex();
                                            }}
                                            type="button"
                                        >
                                            重建索引
                                        </button>
                                        <button
                                            className="rounded-xl border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
                                            onClick={() => {
                                                void handleClearRuns();
                                            }}
                                            type="button"
                                        >
                                            清理历史运行记录
                                        </button>
                                    </div>
                                </section>

                                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                                    <h3 className="text-lg font-semibold text-foreground">
                                        保存更改
                                    </h3>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                        当前产品只保留 Outlook 目录、AI
                                        连接参数和基础数据管理，不再暴露通知、模式切换和实验开关。
                                    </p>
                                    <button
                                        className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                                        onClick={() => {
                                            void handleSaveSettings();
                                        }}
                                        type="button"
                                    >
                                        保存设置
                                    </button>
                                </section>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
```

- [x] **Step 2: Verify typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/app/App.tsx
git commit -m "feat: restructure sidebar with icons, theme toggle, and semantic colors"
```

---

## Task 9: OnboardingFlow — Brand + Semantic Colors

**Files:**
- Modify: `src/renderer/app/OnboardingFlow.tsx`

- [x] **Step 1: Update OnboardingFlow.tsx**

Changes needed:
1. Brand text `mailCopilot` → `Maelor` (line 167)
2. `getStepClass`: `border-blue-600 bg-blue-600 text-white` → `border-primary bg-primary text-primary-foreground`; inactive: `border-slate-200 bg-white text-slate-500` → `border-border bg-card text-muted-foreground`
3. All `bg-blue-600` buttons → `bg-primary`, `hover:bg-blue-700` → `hover:bg-primary/90`
4. All `focus:border-blue-600` → `focus:border-primary`
5. `bg-slate-50` → `bg-background`
6. `bg-white` → `bg-card`
7. `border-slate-200` → `border-border`
8. `text-slate-900` → `text-foreground`
9. `text-slate-500` / `text-slate-600` → `text-muted-foreground`
10. `text-slate-700` → `text-foreground`
11. `bg-slate-50 p-4` stat cards → `bg-muted p-4`
12. Status badges keep their semantic colors (emerald/amber/rose) but those are fine for both modes already since they use specific light tones
13. `bg-slate-900` (complete button) → `bg-primary`
14. Outer container: `bg-slate-50` → `bg-background`

The full replacement of `getStepClass`:
```typescript
function getStepClass(active: boolean): string {
    return active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-muted-foreground';
}
```

Apply all color replacements throughout the file. Every `bg-blue-600` → `bg-primary`, every `hover:bg-blue-700` → `hover:bg-primary/90`, every `disabled:bg-slate-400` → `disabled:opacity-50`, every `border-slate-300` → `border-border`, every `focus:border-blue-600` → `focus:border-primary`, every `hover:border-slate-400 hover:bg-slate-50` → `hover:bg-muted`.

- [x] **Step 2: Verify typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/app/OnboardingFlow.tsx
git commit -m "feat: update OnboardingFlow with Maelor branding and semantic colors"
```

---

## Task 10: RunSummaryCards — Icons + Semantic Colors

**Files:**
- Modify: `src/renderer/components/runs/RunSummaryCards.tsx`

- [x] **Step 1: Update RunSummaryCards.tsx**

Replace the entire file:

```tsx
import { AlertTriangle, Clock, FileText, Mail } from 'lucide-react';

import type { RunDetail } from '@shared/types/app';

import { formatDate } from './runFormatting';

interface RunSummaryCardsProps {
    run: RunDetail;
}

const cards = [
    { key: 'time', label: '扫描时间', icon: Clock },
    { key: 'pst', label: 'PST 文件数', icon: FileText },
    { key: 'email', label: '处理邮件数', icon: Mail },
    { key: 'items', label: '事项数 / 需复核', icon: AlertTriangle },
] as const;

export function RunSummaryCards({ run }: RunSummaryCardsProps) {
    const values: Record<string, string> = {
        time: formatDate(run.startedAt),
        pst: String(run.pstCount),
        email: String(run.processedEmailCount),
        items: `${run.itemCount} / ${run.lowConfidenceCount}`,
    };

    return (
        <section className="grid gap-4 lg:grid-cols-4">
            {cards.map((card) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.key}
                        className="rounded-3xl border border-border border-l-4 border-l-primary/20 bg-card p-5 shadow-sm"
                    >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                            <Icon className="h-3.5 w-3.5" />
                            {card.label}
                        </div>
                        <div className={`mt-2 font-semibold text-foreground ${card.key === 'time' ? 'text-sm' : 'text-2xl'}`}>
                            {values[card.key]}
                        </div>
                    </div>
                );
            })}
        </section>
    );
}

export default RunSummaryCards;
```

- [x] **Step 2: Verify typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/runs/RunSummaryCards.tsx
git commit -m "feat: add icons and semantic colors to RunSummaryCards"
```

---

## Task 11: runFormatting.ts — Dark Variants

**Files:**
- Modify: `src/renderer/components/runs/runFormatting.ts`

- [x] **Step 1: Update runFormatting.ts**

Replace `getConfidenceTone` and `getSourceTone`:

```typescript
export function getConfidenceTone(level: ActionItemView['confidenceLevel']): string {
    if (level === 'high') {
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
    }

    if (level === 'medium') {
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
    }

    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400';
}

export function getSourceTone(status: ActionItemView['sourceStatus']): string {
    return status === 'verified'
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
        : 'bg-muted text-muted-foreground';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/runs/runFormatting.ts
git commit -m "feat: add dark mode variants to confidence and source tone classes"
```

---

## Task 12: RunItemList — Semantic Colors

**Files:**
- Modify: `src/renderer/components/runs/RunItemList.tsx`

- [x] **Step 1: Update RunItemList.tsx**

Apply these replacements throughout the file:
- `bg-white` (container) → `bg-card`
- `border-slate-200` → `border-border`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `text-slate-600` → `text-muted-foreground`
- `border-dashed border-slate-300` → `border-dashed border-border`
- `bg-yellow-50` → `bg-yellow-50 dark:bg-yellow-950/30`
- `bg-white` (card) → `bg-card`
- `border-blue-600` → `border-primary`
- `border-slate-200 hover:border-slate-300` → `border-border hover:border-primary/50`
- `bg-slate-100` badge → `bg-muted`
- `text-slate-700` badge → `text-muted-foreground`

- [x] **Step 2: Verify typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/runs/RunItemList.tsx
git commit -m "feat: apply semantic colors and dark mode to RunItemList"
```

---

## Task 13: RunDetailPanel + EvidenceList — Semantic Colors

**Files:**
- Modify: `src/renderer/components/runs/RunDetailPanel.tsx`
- Modify: `src/renderer/components/runs/EvidenceList.tsx`

- [x] **Step 1: Update RunDetailPanel.tsx**

Apply replacements:
- `bg-white` → `bg-card`
- `border-slate-200` → `border-border`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `text-slate-700` → `text-foreground`

- [x] **Step 2: Update EvidenceList.tsx**

Apply replacements:
- `bg-slate-50` → `bg-muted`
- `border-slate-200` → `border-border`
- `border-dashed border-slate-300` → `border-dashed border-border`
- `text-slate-900` → `text-foreground`
- `text-slate-500` → `text-muted-foreground`
- `text-slate-600` → `text-muted-foreground`
- `text-slate-700` → `text-foreground`
- `border-slate-300` (button borders) → `border-border`
- `hover:bg-slate-50` → `hover:bg-muted`

- [x] **Step 3: Verify typecheck**

Run: `pnpm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/runs/RunDetailPanel.tsx src/renderer/components/runs/EvidenceList.tsx
git commit -m "feat: apply semantic colors to RunDetailPanel and EvidenceList"
```

---

## Task 14: LatestRunReview — Button Color

**Files:**
- Modify: `src/renderer/components/runs/LatestRunReview.tsx`

- [x] **Step 1: Update LatestRunReview.tsx**

Apply replacements:
- `bg-white` → `bg-card`
- `border-dashed border-slate-300` → `border-dashed border-border`
- `text-slate-900` → `text-foreground`
- `text-slate-600` → `text-muted-foreground`
- `bg-blue-600` → `bg-primary`
- `hover:bg-blue-700` → `hover:bg-primary/90`
- `text-white` (on the button) → `text-primary-foreground`

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/runs/LatestRunReview.tsx
git commit -m "feat: apply semantic colors to LatestRunReview"
```

---

## Task 15: Placeholder Logo SVG

**Files:**
- Create: `src/renderer/assets/logo.svg`

- [x] **Step 1: Create placeholder logo**

Create `src/renderer/assets/logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="#0D9488"/>
  <text x="16" y="22" text-anchor="middle" font-family="Inter, sans-serif" font-weight="700" font-size="18" fill="white">M</text>
</svg>
```

This is a temporary placeholder — the user will provide the real logo later.

- [ ] **Step 2: Commit**

```bash
git add src/renderer/assets/logo.svg
git commit -m "chore: add placeholder Maelor logo SVG"
```

---

## Task 16: Full Verification

- [x] **Step 1: Run typecheck**

Run: `pnpm run typecheck`
Expected: passes with no errors.

- [x] **Step 2: Run lint**

Run: `pnpm run lint`
Expected: passes. Fix any lint issues.

- [x] **Step 3: Run unit tests**

Run: `pnpm run test:unit`
Expected: all tests pass.

- [x] **Step 4: Final brand reference check**

Run: `grep -ri "mailcopilot" src/ tests/ package.json electron-builder.yml CLAUDE.md README.md docs/ --include="*.ts" --include="*.tsx" --include="*.html" --include="*.json" --include="*.yml" --include="*.md" --include="*.css" --include="*.js"`
Expected: no matches (except possibly in file paths like `docs/superpowers/specs/` which reference the design doc).

- [ ] **Step 5: Commit any fixes**

If lint or tests required fixes:
```bash
git add -A
git commit -m "fix: resolve lint and test issues from rebrand"
```
