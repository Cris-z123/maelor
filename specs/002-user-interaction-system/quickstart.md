# Developer Quickstart Guide: User Interaction System

**Feature**: 002-user-interaction-system
**Date**: 2026-02-28
**Status**: Phase 1 - Developer Onboarding

## Prerequisites

- **Node.js**: v20.x (Active LTS)
- **pnpm**: v8.x or higher
- **Git**: For version control
- **IDE**: VS Code with TypeScript, ESLint, Prettier extensions recommended

---

## Installation

```bash
# Clone repository
git clone https://github.com/your-org/mailCopilot.git
cd mailCopilot

# Install dependencies
pnpm install

# Run database migrations (if needed)
pnpm run db:migrate

# Start development server
pnpm dev
```

---

## Development Workflow

### Start Development

```bash
# Main + Renderer (hot reload enabled)
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm type-check

# Linting
pnpm lint
pnpm lint:fix
```

### Build for Production

```bash
# Build application
pnpm build

# Package application
pnpm package
```

---

## Project Structure Overview

```
mailCopilot/
├── src/
│   ├── main/              # Main process (backend)
│   │   ├── onboarding/    # Setup wizard (NEW)
│   │   ├── notifications/ # Desktop notifications (NEW)
│   │   ├── config/        # Configuration (EXTEND)
│   │   ├── llm/           # LLM adapters (EXTEND)
│   │   └── database/      # Database layer (EXTEND)
│   │
│   ├── renderer/          # Renderer process (frontend UI)
│   │   ├── components/
│   │   │   ├── onboarding/    # Setup wizard components (NEW)
│   │   │   ├── reports/        # Daily report display (NEW)
│   │   │   ├── generation/    # Report generation UI (NEW)
│   │   │   ├── history/        # Historical reports (NEW)
│   │   │   ├── settings/       # Settings page (NEW)
│   │   │   └── shared/         # Shared UI components (NEW)
│   │   ├── stores/          # Zustand state management (NEW)
│   │   ├── services/        # IPC client abstraction (NEW)
│   │   └── hooks/           # React hooks (NEW)
│   │
│   └── shared/             # Shared between processes
│       ├── types/          # TypeScript types (EXTEND)
│       └── schemas/        # Zod schemas (EXTEND)
│
├── tests/                 # Test suites
│   ├── unit/              # Unit tests (NEW/EXTEND)
│   └── integration/       # Integration tests (EXTEND)
│
└── docs/                  # Documentation
    ├── user-interaction-design.md
    └── tech-architecture.md
```

---

## Common Tasks

### Add a New UI Component

1. Create component file:
```typescript
// src/renderer/components/reports/MyComponent.tsx
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  return <div>{prop1}</div>
}
```

2. Create barrel export (if in feature directory):
```typescript
// src/renderer/components/reports/index.ts
export { MyComponent } from './MyComponent'
```

3. Use component:
```typescript
import { MyComponent } from '@renderer/components/reports'
```

### Add a New IPC Channel

1. Define schema in `src/shared/schemas/`:
```typescript
import { z } from 'zod'

export const MyRequestSchema = z.object({
  param1: z.string(),
  param2: z.number()
})

export const MyResponseSchema = z.object({
  result: z.boolean()
})
```

2. Register handler in `src/main/ipc/handlers.ts`:
```typescript
import { ipcMain } from 'electron'
import { MyRequestSchema, MyResponseSchema } from '@shared/schemas/my-feature'

ipcMain.handle('my-feature:action', async (event, request) => {
  const validated = MyRequestSchema.parse(request)
  // Process request
  const result = { success: true }
  return MyResponseSchema.parse(result)
})
```

3. Add to IPC whitelist in constitution if needed

4. Use in renderer:
```typescript
import { ipcRenderer } from 'electron'
import { MyRequestSchema } from '@shared/schemas/my-feature'

const response = await ipcRenderer.invoke('my-feature:action', {
  param1: 'value',
  param2: 123
})
```

### Add a New Zustand Store

1. Create store file:
```typescript
// src/renderer/stores/myStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface MyStore {
  state1: string
  setState1: (value: string) => void
}

export const useMyStore = create<MyStore>()(
  persist(
    (set) => ({
      state1: 'initial',
      setState1: (value) => set({ state1: value })
    }),
    { name: 'my-store' }
  )
)
```

2. Use in component:
```typescript
import { useMyStore } from '@renderer/stores/myStore'

function MyComponent() {
  const { state1, setState1 } = useMyStore()
  return <div>{state1}</div>
}
```

### Add Database Migration

1. Create migration file:
```sql
-- migrations/002-add-user-interaction-tables.sql
CREATE TABLE IF NOT EXISTS user_config (...);
```

2. Run migration:
```bash
pnpm run db:migrate
```

---

## Testing Guidelines

### Unit Tests

```typescript
// tests/unit/renderer/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MyComponent } from '@/renderer/components/reports/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent prop1="test" />)
    expect(screen.getByText('test')).toBeInTheDocument()
  })
})
```

### Integration Tests

```typescript
// tests/integration/ipc/handlers.test.ts
import { ipcMain } from 'electron'
import { describe, it, expect } from 'vitest'
import { handleGetOnboardingStatus } from '@/main/ipc/handlers'

describe('Onboarding IPC Handlers', () => {
  it('returns onboarding status', async () => {
    const result = await handleGetOnboardingStatus()
    expect(result).toHaveProperty('completed')
  })
})
```

### Run Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# Integration tests only
pnpm test:integration

# Coverage report
pnpm test:coverage
```

---

## Debugging Tips

### Main Process Debugging

```bash
# Run in debug mode
pnpm dev:debug

# Connect Chrome DevTools to main process
chrome://inspect
```

### Renderer Process Debugging

- Press `F12` or `Cmd+Option+I` (macOS) / `Ctrl+Shift+I` (Windows/Linux)
- React DevTools extension for component inspection

### IPC Communication Debugging

```typescript
// Log all IPC traffic
console.log('Sending IPC request:', request)
console.log('Received IPC response:', response)
```

---

## Code Style Guide

### TypeScript Conventions

- Use strict type checking (`strict: true` in tsconfig.json)
- Prefer `interface` for object shapes, `type` for unions/primitives
- Use `import type` for type-only imports
- Export interfaces as named exports (per constitution module standards)

### Component Conventions

- Functional components with hooks
- Props interfaces defined inline or imported
- Use `React.FC` only if component needs generic types
- Barrel exports for feature directories (`index.ts`)

### State Management Conventions

- Separate stores by feature domain
- Use `persist` middleware for sensitive state encryption
- Subscribe to specific slices to avoid unnecessary re-renders

### File Naming

- Components: PascalCase (e.g., `ReportView.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useToast.ts`)
- Stores: camelCase with `Store` suffix (e.g., `reportStore.ts`)
- Utilities: camelCase (e.g., `formatDate.ts`)

---

## Constitution Compliance

All code must comply with the mailCopilot constitution (v1.3.0):

- **Privacy-first**: No cloud sync, device-bound storage
- **Anti-hallucination**: All items track source emails, low-confidence items degraded not deleted
- **Data minimization**: Email body cleared immediately, metadata retained 90 days (configurable)
- **Mode switching**: Hot switching (no restart), local mode physically blocks non-local requests
- **Testing**: ≥80% line coverage, ≥70% branch coverage, security modules 100%

See `.specify/memory/constitution.md` for full details.

---

## Troubleshooting

### Common Issues

**Issue**: "Cannot find module '@/renderer/...'"
- **Solution**: Ensure `tsconfig.json` includes path aliases for `@renderer` and `@shared`

**Issue**: "IPC channel timeout"
- **Solution**: Check if handler is registered in main process, verify channel name matches whitelist

**Issue**: "Database locked"
- **Solution**: Ensure single-instance lock is enabled, check for unclosed database connections

**Issue**: "Tests failing with 'Cannot find module'"
- **Solution**: Run `pnpm install` to ensure all dependencies installed

### Getting Help

- Review constitution: `.specify/memory/constitution.md`
- Review architecture: `docs/tech-architecture.md`
- Check feature spec: `specs/002-user-interaction-system/spec.md`

---

## Next Steps

1. ✅ Review architecture and constitution
2. ✅ Install dependencies (`pnpm install`)
3. ✅ Run development server (`pnpm dev`)
4. ⏳ Run tests (`pnpm test`)
5. ⏳ Start implementation (see `tasks.md` - generated by `/speckit.tasks`)

**Ready for Phase 1: Update Agent Context** ✓
