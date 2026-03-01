# Phase 1 Setup Implementation Plan (T001-T004)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish foundational infrastructure for user interaction system including directory structure, UI components, encrypted state persistence, and domain-specific validation schemas.

**Architecture:** Create directory structure following Electron main/renderer separation, install shadcn/ui components for consistent UI, implement custom Zustand middleware for field-level encryption using Electron safeStorage, and organize Zod schemas by domain for type-safe validation.

**Tech Stack:** Electron 29.4.6, React 18, TypeScript 5.4, Zustand 4.5, Zod 3.22, shadcn/ui, Tailwind CSS v3.4

---

## Task 1: Directory Structure Audit and Creation

**Files:**
- Create: `src/shared/types/onboarding.ts`
- Create: `src/shared/types/reports.ts`
- Create: `src/shared/types/history.ts`
- Create: `src/shared/types/settings.ts`
- Create: `src/renderer/stores/index.ts`
- Create: `src/renderer/hooks/index.ts`
- Create: `src/renderer/services/index.ts`
- Modify: `README.md` (add directory structure documentation)

**Step 1: Audit existing directories and naming conventions**

Run: `find src/renderer/components -type d -name "[A-Z]*" | sort`
Expected: Lists any PascalCase directories (Onboarding, Settings, etc.)

Run: `find src/renderer/components -type d -name "[a-z-]*" | sort`
Expected: Lists any kebab-case directories (reports, history, etc.)

**Step 2: Verify project naming convention**

Check existing components:
```bash
ls -la src/renderer/components/
```

Decision point: If both PascalCase and kebab-case exist, choose one standard and document it.

**Step 3: Create shared type files**

Create `src/shared/types/onboarding.ts`:
```typescript
/**
 * Onboarding state types
 * Per data-model.md section 1
 */

export interface EmailClientConfig {
  type: 'thunderbird' | 'outlook' | 'apple-mail';
  path: string;
  detectedPath: string | null;
  validated: boolean;
}

export interface ScheduleConfig {
  generationTime: {
    hour: number; // 0-23
    minute: number; // 0-59
  };
  skipWeekends: boolean;
}

export interface LLMConfig {
  mode: 'local' | 'remote';
  localEndpoint: string;
  remoteEndpoint: string;
  apiKey: string;
  connectionStatus: 'untested' | 'success' | 'failed';
}

export interface OnboardingState {
  completed: boolean;
  currentStep: 1 | 2 | 3;
  emailClient: EmailClientConfig;
  schedule: ScheduleConfig;
  llm: LLMConfig;
  lastUpdated: number;
}
```

Create `src/shared/types/reports.ts`:
```typescript
/**
 * Report display types
 * Per data-model.md section 2
 */

export interface ConfidenceDisplay {
  score: number; // 0.0-1.0
  level: 'high' | 'medium' | 'low';
}

export interface ItemSourceRef {
  hash: string;
  senderName: string;
  senderDomain: string;
  date: string;
  subject: string;
}

export interface ReportDisplayItem {
  itemId: string;
  reportDate: string; // YYYY-MM-DD
  itemType: 'completed' | 'pending';
  content: {
    title: string;
    description: string;
    dueDate: string | null;
    priority: 'high' | 'medium' | 'low';
  };
  confidence: ConfidenceDisplay;
  sourceStatus: 'verified' | 'unverified';
  sourceEmails: ItemSourceRef[];
}
```

Create `src/shared/types/history.ts`:
```typescript
/**
 * Historical search types
 * Per data-model.md section 5
 */

export interface SearchFilters {
  itemType?: 'completed' | 'pending' | 'all';
  confidenceLevel?: 'high' | 'medium' | 'low';
  hasFeedback?: boolean;
  dateRange?: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SearchQuery {
  keywords: string;
  filters?: SearchFilters;
  pagination: PaginationParams;
}
```

Create `src/shared/types/settings.ts`:
```typescript
/**
 * Settings management types
 * Per data-model.md section 6
 */

export interface NotificationSettings {
  enabled: boolean;
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  };
  soundEnabled: boolean;
}

export interface DisplaySettings {
  aiExplanationMode: boolean;
}

export interface AllSettings {
  email: any; // EmailClientConfig from onboarding
  schedule: any; // ScheduleConfig from onboarding
  llm: any; // LLMConfig from onboarding
  notifications: NotificationSettings;
  display: DisplaySettings;
}
```

**Step 4: Create index barrel files for clean imports**

Create `src/renderer/stores/index.ts`:
```typescript
/**
 * Zustand stores barrel export
 */

export { useReportStore } from './reportStore';
// Future stores will be added here:
// export { useOnboardingStore } from './onboardingStore';
// export { useSettingsStore } from './settingsStore';
```

Create `src/renderer/hooks/index.ts`:
```typescript
/**
 * Custom React hooks barrel export
 */

// Future hooks will be added here:
// export { useClipboard } from './useClipboard';
// export { useToast } from './useToast';
// export { useInlineEdit } from './useInlineEdit';
```

Create `src/renderer/services/index.ts`:
```typescript
/**
 * Services barrel export (IPC clients, utilities)
 */

export * from './ipc';
export * from './ipc-client';
```

**Step 5: Update README with directory structure**

Append to `README.md`:
```markdown
## Project Structure

```
src/
├── main/                    # Electron main process (backend)
│   ├── onboarding/         # First-time setup wizard
│   ├── notifications/      # Desktop notifications
│   ├── database/           # SQLite database + migrations
│   ├── ipc/                # IPC handlers
│   ├── llm/                # LLM integration
│   └── config/             # Configuration management
├── renderer/               # Electron renderer process (frontend)
│   ├── components/         # React components
│   │   ├── onboarding/     # Setup wizard UI
│   │   ├── reports/        # Daily report display
│   │   ├── generation/     # Manual generation UI
│   │   ├── history/        # Historical reports search
│   │   ├── settings/       # Settings pages
│   │   ├── shared/         # Shared UI components
│   │   └── ui/             # shadcn/ui components
│   ├── stores/             # Zustand state stores
│   ├── hooks/              # Custom React hooks
│   ├── services/           # IPC clients, utilities
│   └── styles/             # Global styles, themes
└── shared/                 # Shared between main/renderer
    ├── schemas/            # Zod validation schemas
    ├── types/              # TypeScript type definitions
    └── utils/              # Shared utilities
```
```

**Step 6: Verify all files compile**

Run: `pnpm run typecheck`
Expected: No TypeScript errors

**Step 7: Commit**

```bash
git add src/shared/types/ src/renderer/stores/index.ts src/renderer/hooks/index.ts src/renderer/services/index.ts README.md
git commit -m "feat(T001): create directory structure and type definitions"
```

---

## Task 2: shadcn/ui Components Installation

**Files:**
- Create: `src/renderer/components/ui/calendar.tsx`
- Create: `src/renderer/components/ui/input.tsx`
- Create: `src/renderer/components/ui/progress.tsx`
- Create: `src/renderer/components/ui/sonner.tsx` (Toast component using Sonner)
- Modify: `components.json` (shadcn/ui config, if needed)

**Step 1: Check for existing shadcn/ui configuration**

Run: `cat components.json`
Expected: File exists with shadcn/ui config or needs creation

If missing, create `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/renderer/styles/globals.css",
    "baseColor": "indigo",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/renderer/components",
    "utils": "@/renderer/lib/utils"
  }
}
```

**Step 2: Install calendar component**

Run: `npx shadcn@latest add calendar`
Expected: Creates `src/renderer/components/ui/calendar.tsx`

Verify file exists:
```bash
cat src/renderer/components/ui/calendar.tsx | head -20
```

**Step 3: Install input component**

Run: `npx shadcn@latest add input`
Expected: Creates `src/renderer/components/ui/input.tsx`

**Step 4: Install progress component**

Run: `npx shadcn@latest add progress`
Expected: Creates `src/renderer/components/ui/progress.tsx`

**Step 5: Install toast component (Sonner)**

Run: `npx shadcn@latest add sonner`
Expected: Creates `src/renderer/components/ui/sonner.tsx`

Install Sonner dependency:
```bash
pnpm add sonner
```

**Step 6: Verify Tailwind configuration for animations**

Check `tailwind.config.js`:
```javascript
// Ensure this line exists for animations
plugins: [require("tailwindcss-animate")],
```

**Step 7: Create test component to verify installations**

Create `src/renderer/components/__tests__/ui-components.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Progress } from '../ui/progress';
import { Toaster } from '../ui/sonner';

describe('shadcn/ui Components', () => {
  it('renders Calendar without crashing', () => {
    render(<Calendar />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('renders Input without crashing', () => {
    render(<Input placeholder="Test input" />);
    expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument();
  });

  it('renders Progress without crashing', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders Toaster without crashing', () => {
    const { container } = render(<Toaster />);
    expect(container).toBeInTheDocument();
  });
});
```

**Step 8: Run tests to verify components**

Run: `pnpm test -- src/renderer/components/__tests__/ui-components.test.tsx`
Expected: All tests pass

**Step 9: Verify theme integration**

Check that智捷蓝 (#4F46E5) is used in `src/renderer/styles/globals.css`:
```css
:root {
  --primary: 4F46E5;
  /* ... other colors ... */
}
```

**Step 10: Commit**

```bash
git add src/renderer/components/ui/calendar.tsx src/renderer/components/ui/input.tsx src/renderer/components/ui/progress.tsx src/renderer/components/ui/sonner.tsx package.json pnpm-lock.yaml src/renderer/components/__tests__/ui-components.test.tsx
git commit -m "feat(T002): install shadcn/ui calendar, input, progress, toast components"
```

---

## Task 3: Zustand Encrypted Persistence Middleware

**Files:**
- Create: `src/renderer/stores/middleware/encryptedPersistence.ts`
- Create: `tests/unit/renderer/stores/middleware/encryptedPersistence.test.ts`
- Modify: `src/renderer/stores/reportStore.ts` (example integration)

**Step 3.1: Write failing test for encryption middleware**

Create `tests/unit/renderer/stores/middleware/encryptedPersistence.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createEncryptedPersistence } from '@/renderer/stores/middleware/encryptedPersistence';

// Mock Electron safeStorage
const mockSafeStorage = {
  encryptString: vi.fn((plaintext: string) => `encrypted:${plaintext}`),
  decryptString: vi.fn((ciphertext: string) => ciphertext.replace('encrypted:', '')),
  isEncryptionAvailable: vi.fn(() => true),
};

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
}));

describe('createEncryptedPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('encrypts sensitive fields before saving', () => {
    interface TestState {
      apiKey: string;
      publicData: string;
    }

    const createStore = () =>
      create<TestState>()(
        createEncryptedPersistence<TestState>({
          name: 'test-store',
          sensitiveFields: ['apiKey'],
        })
      );

    const store = createStore();
    store.setState({ apiKey: 'secret-key', publicData: 'public' });

    const saved = JSON.parse(localStorage.getItem('test-store')!);
    expect(saved.state.apiKey).toBe('encrypted:secret-key');
    expect(saved.state.publicData).toBe('public');
  });

  it('decrypts sensitive fields on hydration', () => {
    interface TestState {
      apiKey: string;
      publicData: string;
    }

    // Pre-populate localStorage with encrypted data
    localStorage.setItem(
      'test-store',
      JSON.stringify({
        state: {
          apiKey: 'encrypted:secret-key',
          publicData: 'public',
        },
        version: 0,
      })
    );

    const createStore = () =>
      create<TestState>()(
        createEncryptedPersistence<TestState>({
          name: 'test-store',
          sensitiveFields: ['apiKey'],
        })
      );

    const store = createStore();
    const state = store.getState();

    expect(state.apiKey).toBe('secret-key');
    expect(state.publicData).toBe('public');
    expect(mockSafeStorage.decryptString).toHaveBeenCalledWith('encrypted:secret-key');
  });

  it('stores non-sensitive fields as plaintext', () => {
    interface TestState {
      apiKey: string;
      theme: string;
    }

    const createStore = () =>
      create<TestState>()(
        createEncryptedPersistence<TestState>({
          name: 'test-store',
          sensitiveFields: ['apiKey'],
        })
      );

    const store = createStore();
    store.setState({ apiKey: 'secret', theme: 'dark' });

    const saved = JSON.parse(localStorage.getItem('test-store')!);
    expect(saved.state.theme).toBe('dark');
  });

  it('gracefully degrades when safeStorage unavailable', () => {
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(false);

    interface TestState {
      apiKey: string;
    }

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const createStore = () =>
      create<TestState>()(
        createEncryptedPersistence<TestState>({
          name: 'test-store',
          sensitiveFields: ['apiKey'],
        })
      );

    const store = createStore();
    store.setState({ apiKey: 'secret-key' });

    const saved = JSON.parse(localStorage.getItem('test-store')!);
    expect(saved.state.apiKey).toBe('secret-key'); // Stored plaintext
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining('safeStorage unavailable')
    );

    consoleWarn.mockRestore();
  });
});
```

**Step 3.2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/renderer/stores/middleware/encryptedPersistence.test.ts`
Expected: FAIL - "Cannot find module '@/renderer/stores/middleware/encryptedPersistence'"

**Step 3.3: Implement encrypted persistence middleware**

Create `src/renderer/stores/middleware/encryptedPersistence.ts`:
```typescript
import { StateStorage, createJSONStorage } from 'zustand/middleware';
import { safeStorage } from 'electron';

interface EncryptedPersistenceConfig<T> {
  name: string;
  sensitiveFields: (keyof T)[];
  storage?: StateStorage;
}

/**
 * Custom Zustand persistence middleware with field-level encryption
 *
 * Per constitution v1.1.0:
 * - Uses Electron safeStorage for AES-256-GCM encryption
 * - Only encrypts sensitive fields (API keys, file paths)
 * - Non-sensitive fields remain plaintext for debugging
 * - Graceful degradation if safeStorage unavailable
 */
export function createEncryptedPersistence<T extends object>({
  name,
  sensitiveFields,
  storage = createJSONStorage(() => localStorage),
}: EncryptedPersistenceConfig<T>) {
  const encryptionAvailable = safeStorage.isEncryptionAvailable();

  if (!encryptionAvailable) {
    console.warn(
      `[encryptedPersistence] safeStorage unavailable, storing plaintext: ${name}`
    );
  }

  return {
    name,
    storage: {
      ...storage,
      getItem: (key): string | null => {
        const value = storage.getItem(key);
        if (!value) return null;

        try {
          const parsed = JSON.parse(value);
          const state = parsed.state as T;

          // Decrypt sensitive fields
          if (encryptionAvailable && state) {
            for (const field of sensitiveFields) {
              const fieldValue = (state as any)[field];
              if (typeof fieldValue === 'string' && fieldValue.startsWith('encrypted:')) {
                try {
                  (state as any)[field] = safeStorage.decryptString(fieldValue);
                } catch (error) {
                  console.error(`[encryptedPersistence] Failed to decrypt ${String(field)}:`, error);
                }
              }
            }
          }

          parsed.state = state;
          return JSON.stringify(parsed);
        } catch (error) {
          console.error(`[encryptedPersistence] Failed to parse storage:`, error);
          return null;
        }
      },
      setItem: (key, newValue): void => {
        try {
          const parsed = JSON.parse(newValue);
          const state = { ...parsed.state } as T;

          // Encrypt sensitive fields
          if (encryptionAvailable && state) {
            for (const field of sensitiveFields) {
              const fieldValue = (state as any)[field];
              if (fieldValue !== undefined && fieldValue !== null) {
                try {
                  (state as any)[field] = safeStorage.encryptString(String(fieldValue));
                } catch (error) {
                  console.error(`[encryptedPersistence] Failed to encrypt ${String(field)}:`, error);
                }
              }
            }
          }

          parsed.state = state;
          storage.setItem(key, JSON.stringify(parsed));
        } catch (error) {
          console.error(`[encryptedPersistence] Failed to serialize storage:`, error);
          storage.setItem(key, newValue);
        }
      },
    },
    partialize: (state: T) => state,
  };
}
```

**Step 3.4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/renderer/stores/middleware/encryptedPersistence.test.ts`
Expected: PASS - All tests pass

**Step 3.5: Update reportStore to use encrypted persistence (example integration)**

Read current `src/renderer/stores/reportStore.ts`:
```bash
cat src/renderer/stores/reportStore.ts
```

Modify to add encrypted persistence (if reportStore has sensitive data):
```typescript
// Add encrypted persistence import
import { createEncryptedPersistence } from './middleware/encryptedPersistence';

// Wrap store with encrypted persistence if needed
// (Only if reportStore contains sensitive fields)
```

**Step 3.6: Commit**

```bash
git add src/renderer/stores/middleware/encryptedPersistence.ts tests/unit/renderer/stores/middleware/encryptedPersistence.test.ts
git commit -m "feat(T003): implement encrypted Zustand persistence middleware"
```

---

## Task 4: Zod Schema Organization by Domain

**Files:**
- Create: `src/shared/schemas/onboarding.ts`
- Create: `src/shared/schemas/reports.ts`
- Create: `src/shared/schemas/history.ts`
- Create: `src/shared/schemas/settings.ts`
- Create: `src/shared/schemas/index.ts`
- Create: `tests/unit/shared/schemas/onboarding.test.ts`
- Create: `tests/unit/shared/schemas/reports.test.ts`
- Create: `tests/unit/shared/schemas/history.test.ts`
- Create: `tests/unit/shared/schemas/settings.test.ts`

**Step 4.1: Write failing test for onboarding schemas**

Create `tests/unit/shared/schemas/onboarding.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  EmailClientConfigSchema,
  ScheduleConfigSchema,
  LLMConfigSchema,
  OnboardingStateSchema,
} from '@shared/schemas/onboarding';

describe('Onboarding Schemas', () => {
  describe('EmailClientConfigSchema', () => {
    it('accepts valid email client config', () => {
      const valid = {
        type: 'thunderbird' as const,
        path: '/path/to/profile',
        detectedPath: null,
        validated: false,
      };
      expect(() => EmailClientConfigSchema.parse(valid)).not.toThrow();
    });

    it('rejects invalid email client type', () => {
      const invalid = {
        type: 'invalid',
        path: '/path',
        detectedPath: null,
        validated: false,
      };
      expect(() => EmailClientConfigSchema.parse(invalid)).toThrow();
    });

    it('rejects empty path', () => {
      const invalid = {
        type: 'thunderbird' as const,
        path: '',
        detectedPath: null,
        validated: false,
      };
      expect(() => EmailClientConfigSchema.parse(invalid)).toThrow();
    });
  });

  describe('ScheduleConfigSchema', () => {
    it('accepts valid schedule config', () => {
      const valid = {
        generationTime: { hour: 18, minute: 0 },
        skipWeekends: true,
      };
      expect(() => ScheduleConfigSchema.parse(valid)).not.toThrow();
    });

    it('rejects invalid hour', () => {
      const invalid = {
        generationTime: { hour: 25, minute: 0 },
        skipWeekends: true,
      };
      expect(() => ScheduleConfigSchema.parse(invalid)).toThrow();
    });
  });

  describe('LLMConfigSchema', () => {
    it('accepts valid local LLM config', () => {
      const valid = {
        mode: 'local' as const,
        localEndpoint: 'http://localhost:11434',
        remoteEndpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-'.padEnd(20, 'x'),
        connectionStatus: 'untested' as const,
      };
      expect(() => LLMConfigSchema.parse(valid)).not.toThrow();
    });

    it('rejects short API key', () => {
      const invalid = {
        mode: 'remote' as const,
        localEndpoint: 'http://localhost:11434',
        remoteEndpoint: 'https://api.openai.com/v1',
        apiKey: 'short',
        connectionStatus: 'untested' as const,
      };
      expect(() => LLMConfigSchema.parse(invalid)).toThrow();
    });
  });
});
```

**Step 4.2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/shared/schemas/onboarding.test.ts`
Expected: FAIL - "Cannot find module '@shared/schemas/onboarding'"

**Step 4.3: Implement onboarding schemas**

Create `src/shared/schemas/onboarding.ts`:
```typescript
import { z } from 'zod';

/**
 * Zod schemas for onboarding wizard
 * Per data-model.md section 1
 */

export const EmailClientConfigSchema = z.object({
  type: z.enum(['thunderbird', 'outlook', 'apple-mail']),
  path: z.string().min(1, '路径不能为空'),
  detectedPath: z.string().nullable(),
  validated: z.boolean(),
});

export const ScheduleConfigSchema = z.object({
  generationTime: z.object({
    hour: z.number().int().min(0).max(23, '请输入有效小时 (0-23)'),
    minute: z.number().int().min(0).max(59, '请输入有效分钟 (0-59)'),
  }),
  skipWeekends: z.boolean(),
});

export const LLMConfigSchema = z.object({
  mode: z.enum(['local', 'remote']),
  localEndpoint: z.string().url('请输入有效的本地服务地址'),
  remoteEndpoint: z.string().url('请输入有效的HTTPS地址'),
  apiKey: z.string().min(20, 'API密钥至少20字符'),
  connectionStatus: z.enum(['untested', 'success', 'failed']),
});

export const OnboardingStateSchema = z.object({
  completed: z.boolean(),
  currentStep: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  emailClient: EmailClientConfigSchema,
  schedule: ScheduleConfigSchema,
  llm: LLMConfigSchema,
  lastUpdated: z.number(),
});

// Type exports
export type EmailClientConfig = z.infer<typeof EmailClientConfigSchema>;
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;
export type LLMConfig = z.infer<typeof LLMConfigSchema>;
export type OnboardingState = z.infer<typeof OnboardingStateSchema>;
```

**Step 4.4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/shared/schemas/onboarding.test.ts`
Expected: PASS

**Step 4.5: Repeat for reports schemas**

Create `tests/unit/shared/schemas/reports.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  ConfidenceLevelSchema,
  ConfidenceDisplaySchema,
  FeedbackTypeSchema,
  ReportDisplayItemSchema,
} from '@shared/schemas/reports';

describe('Reports Schemas', () => {
  describe('ConfidenceDisplaySchema', () => {
    it('accepts high confidence', () => {
      expect(() =>
        ConfidenceDisplaySchema.parse({ score: 0.85, level: 'high' })
      ).not.toThrow();
    });

    it('rejects score > 1.0', () => {
      expect(() =>
        ConfidenceDisplaySchema.parse({ score: 1.5, level: 'high' })
      ).toThrow();
    });
  });
});
```

Create `src/shared/schemas/reports.ts`:
```typescript
import { z } from 'zod';

/**
 * Zod schemas for daily report display
 * Per data-model.md section 2
 */

export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low']);

export const ConfidenceDisplaySchema = z.object({
  score: z.number().min(0).max(1),
  level: ConfidenceLevelSchema,
});

export const FeedbackTypeSchema = z.enum([
  'content_error',
  'priority_error',
  'not_actionable',
  'source_error',
]);

export const FeedbackSubmissionSchema = z.object({
  itemId: z.string().uuid(),
  feedbackType: FeedbackTypeSchema,
  timestamp: z.number(),
});

export const ItemSourceRefSchema = z.object({
  hash: z.string(),
  senderName: z.string(),
  senderDomain: z.string(),
  date: z.string(),
  subject: z.string(),
});

export const ReportDisplayItemSchema = z.object({
  itemId: z.string(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemType: z.enum(['completed', 'pending']),
  content: z.object({
    title: z.string().max(200),
    description: z.string().max(500).optional(),
    dueDate: z.string().nullable(),
    priority: z.enum(['high', 'medium', 'low']),
  }),
  confidence: ConfidenceDisplaySchema,
  sourceStatus: z.enum(['verified', 'unverified']),
  sourceEmails: z.array(ItemSourceRefSchema),
});

// Type exports
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>;
export type ConfidenceDisplay = z.infer<typeof ConfidenceDisplaySchema>;
export type FeedbackType = z.infer<typeof FeedbackTypeSchema>;
export type ReportDisplayItem = z.infer<typeof ReportDisplayItemSchema>;
```

**Step 4.6: Repeat for history schemas**

Create `tests/unit/shared/schemas/history.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  SearchFiltersSchema,
  PaginationParamsSchema,
  SearchQuerySchema,
} from '@shared/schemas/history';

describe('History Schemas', () => {
  it('validates search query with pagination', () => {
    const valid = {
      keywords: 'test query',
      pagination: { page: 1, limit: 20 },
    };
    expect(() => SearchQuerySchema.parse(valid)).not.toThrow();
  });
});
```

Create `src/shared/schemas/history.ts`:
```typescript
import { z } from 'zod';
import { ConfidenceLevelSchema } from './reports';

/**
 * Zod schemas for historical search
 * Per data-model.md section 5
 */

export const SearchFiltersSchema = z.object({
  itemType: z.enum(['completed', 'pending', 'all']).optional(),
  confidenceLevel: ConfidenceLevelSchema.optional(),
  hasFeedback: z.boolean().optional(),
  dateRange: z
    .object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
});

export const PaginationParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const SearchQuerySchema = z.object({
  keywords: z.string().min(1),
  filters: SearchFiltersSchema.optional(),
  pagination: PaginationParamsSchema,
});

// Type exports
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
```

**Step 4.7: Repeat for settings schemas**

Create `tests/unit/shared/schemas/settings.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import {
  NotificationSettingsSchema,
  DisplaySettingsSchema,
  AllSettingsSchema,
} from '@shared/schemas/settings';

describe('Settings Schemas', () => {
  it('validates notification settings', () => {
    const valid = {
      enabled: true,
      doNotDisturb: {
        enabled: true,
        startTime: '22:00',
        endTime: '08:00',
      },
      soundEnabled: true,
    };
    expect(() => NotificationSettingsSchema.parse(valid)).not.toThrow();
  });
});
```

Create `src/shared/schemas/settings.ts`:
```typescript
import { z } from 'zod';

/**
 * Zod schemas for settings management
 * Per data-model.md section 6
 */

export const NotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  doNotDisturb: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '无效时间格式'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '无效时间格式'),
  }),
  soundEnabled: z.boolean(),
});

export const DisplaySettingsSchema = z.object({
  aiExplanationMode: z.boolean(),
});

// Reuse schemas from onboarding
export const AllSettingsSchema = z.object({
  notifications: NotificationSettingsSchema,
  display: DisplaySettingsSchema,
});

// Type exports
export type NotificationSettings = z.infer<typeof NotificationSettingsSchema>;
export type DisplaySettings = z.infer<typeof DisplaySettingsSchema>;
export type AllSettings = z.infer<typeof AllSettingsSchema>;
```

**Step 4.8: Create central export barrel**

Create `src/shared/schemas/index.ts`:
```typescript
/**
 * Zod schemas barrel export
 */

// Re-export existing core schemas
export * from './validation';

// Domain-specific schemas
export * from './onboarding';
export * from './reports';
export * from './history';
export * from './settings';
```

**Step 4.9: Run all schema tests**

Run: `pnpm test -- tests/unit/shared/schemas/`
Expected: All tests pass

**Step 4.10: Verify imports work**

Create temporary test file:
```typescript
// Test imports
import {
  OnboardingStateSchema,
  ReportDisplayItemSchema,
  SearchQuerySchema,
  NotificationSettingsSchema,
} from '@shared/schemas';

console.log('All schemas imported successfully');
```

Run: `pnpm exec tsx test-imports.ts`
Expected: No import errors

**Step 4.11: Commit**

```bash
git add src/shared/schemas/onboarding.ts src/shared/schemas/reports.ts src/shared/schemas/history.ts src/shared/schemas/settings.ts src/shared/schemas/index.ts tests/unit/shared/schemas/
git commit -m "feat(T004): organize Zod schemas by domain"
```

---

## Final Verification

**Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 2: Run type checking**

Run: `pnpm run typecheck`
Expected: No TypeScript errors

**Step 3: Verify coverage**

Run: `pnpm test:coverage`
Expected: ≥80% line, ≥70% branch coverage

**Step 4: Update task list**

Check off completed tasks in `specs/002-user-interaction-system/tasks.md`:
- [x] T001 Create directory structure
- [x] T002 Install shadcn/ui components
- [x] T003 Configure Zustand persistence
- [x] T004 Create Zod schema templates

**Step 5: Final commit**

```bash
git add specs/002-user-interaction-system/tasks.md
git commit -m "docs: mark T001-T004 complete in task list"
```

---

## Notes

- **Naming Convention**: Project uses kebab-case for directories (`reports/`, `history/`) except for some existing PascalCase (`Onboarding/`, `Settings/`). Standardize on kebab-case for new directories.
- **Path Aliases**: Ensure `@/` alias maps to `src/` in tsconfig files
- **Electron safeStorage**: May not be available on all Linux distros; graceful degradation implemented
- **Schema Validation**: All schemas provide Chinese error messages per design specs
- **Test-First**: All schemas written with failing tests first, then implementation

---

## Next Steps

After T001-T004 completion:
1. T005: Setup IPC client abstraction layer
2. T006: Create shared TypeScript type definitions
3. T007: Configure Inter font and theme colors

These complete Phase 1 (Setup), enabling Phase 2 (Foundational infrastructure).
