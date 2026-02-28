# Zod Validation Schemas

**Feature**: 002-user-interaction-system
**Date**: 2026-02-28
**Status**: Phase 1 Design - Validation Schemas

## Overview

This document defines Zod validation schemas for all IPC communication and data structures. All schemas comply with the constitution's Zod validation requirement.

---

## Onboarding Schemas

```typescript
import { z } from 'zod'

// Email client type
export const EmailClientTypeSchema = z.enum(['thunderbird', 'outlook', 'apple-mail'])

// Email client path validation
export const EmailClientPathSchema = z.string().min(1, '邮件客户端路径不能为空')
  .refine((path) => existsSync(path), { message: "路径不存在" })
  .refine((path) => statSync(path).isDirectory(), { message: "路径必须是目录" })
  .refine((path) => hasEmailFiles(path), { message: "该路径下未找到邮件文件" })

// Schedule generation time
export const GenerationTimeSchema = z.object({
  hour: z.number().int().min(0).max(23, "小时必须在 0-23 之间"),
  minute: z.number().int().min(0).max(59, "分钟必须在 0-59 之间")
})

// LLM local endpoint
export const LocalEndpointSchema = z.string().url("必须是有效的URL")
  .refine((url) => url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1'),
    { message: "本地服务地址必须以 http://localhost 或 http://127.0.0.1 开头" })

// LLM remote endpoint
export const RemoteEndpointSchema = z.string().url("必须是有效的URL")
  .refine((url) => url.startsWith('https://'), { message: "远程服务地址必须使用 HTTPS 协议" })

// API key
export const ApiKeySchema = z.string().min(20, "API密钥至少20个字符")

// Onboarding step data
export const OnboardingStep1Schema = z.object({
  emailClient: z.object({
    type: EmailClientTypeSchema,
    path: EmailClientPathSchema
  })
})

export const OnboardingStep2Schema = z.object({
  schedule: z.object({
    generationTime: GenerationTimeSchema,
    skipWeekends: z.boolean()
  })
})

export const OnboardingStep3RemoteSchema = z.object({
  llm: z.object({
    mode: z.literal('remote'),
    remoteEndpoint: RemoteEndpointSchema,
    apiKey: ApiKeySchema
  })
})

export const OnboardingStep3LocalSchema = z.object({
  llm: z.object({
    mode: z.literal('local'),
    localEndpoint: LocalEndpointSchema
  })
})

export const OnboardingStep3Schema = z.discriminatedUnion('mode', [
  OnboardingStep3RemoteSchema,
  OnboardingStep3LocalSchema
])
```

---

## Report Display Schemas

```typescript
// Confidence score
export const ConfidenceScoreSchema = z.number().min(0).max(1)

// Confidence level
export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low'])

// Item type
export const ItemTypeSchema = z.enum(['completed', 'pending'])

// Priority
export const PrioritySchema = z.enum(['high', 'medium', 'low'])

// Report display item
export const ReportDisplayItemSchema = z.object({
  itemId: z.string(),
  reportDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  itemType: ItemTypeSchema,
  content: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(500).optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    priority: PrioritySchema
  }),
  confidence: z.object({
    score: ConfidenceScoreSchema,
    level: ConfidenceLevelSchema
  }),
  sourceStatus: z.enum(['verified', 'unverified']),
  sourceEmails: z.array(z.object({
    hash: z.string(),
    senderName: z.string(),
    senderDomain: z.string(),
    date: z.string(),
    subject: z.string(),
    filePath: z.string(),
    searchKeywords: z.string(),
    evidenceText: z.string()
  })),
  feedback: z.object({
    submitted: z.boolean(),
    type: z.enum(['accurate', 'content_error', 'priority_error', 'not_actionable', 'source_error']).nullable(),
    timestamp: z.number().int().nonnegative().nullable()
  })
})
```

---

## Search Schemas

```typescript
// Date range type
export const DateRangeTypeSchema = z.enum([
  'all', 'today', 'last-7-days', 'last-30-days', 'this-month', 'last-month', 'custom'
])

// Search query
export const SearchQuerySchema = z.object({
  keywords: z.string().min(1).max(200, "搜索关键词不能为空"),
  dateRange: z.object({
    type: DateRangeTypeSchema,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
  }),
  filters: z.object({
    itemTypes: z.array(ItemTypeSchema).optional(),
    confidenceLevels: z.array(ConfidenceLevelSchema).optional(),
    hasFeedback: z.boolean().optional()
  }).optional(),
  pagination: z.object({
    page: z.number().int().positive().default(1),
    perPage: z.number().int().positive().default(20)
  })
})

// Search result
export const SearchResultSchema = z.object({
  items: z.array(ReportDisplayItemSchema),
  totalCount: z.number().int().nonnegative(),
  totalPages: z.number().int().positive(),
  currentPage: z.number().int().positive(),
  matchHighlights: z.record(z.array(z.string()))
})
```

---

## Settings Schemas

```typescript
// Notification settings
export const NotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  doNotDisturb: z.object({
    enabled: z.boolean(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "时间格式必须是 HH:mm"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "时间格式必须是 HH:mm")
  }),
  sound: z.boolean()
})

// Settings update request
export const SettingsUpdateSchema = z.discriminatedUnion('section', [
  z.object({
    section: z.literal('email'),
    updates: z.object({
      email: z.object({
        clientType: EmailClientTypeSchema,
        path: EmailClientPathSchema
      })
    })
  }),
  z.object({
    section: z.literal('schedule'),
    updates: z.object({
      schedule: z.object({
        generationTime: GenerationTimeSchema,
        skipWeekends: z.boolean()
      })
    })
  }),
  z.object({
    section: z.literal('llm'),
    updates: z.object({
      llm: z.discriminatedUnion('mode', [
        z.object({
          mode: z.literal('remote'),
          remoteEndpoint: RemoteEndpointSchema,
          apiKey: ApiKeySchema
        }),
        z.object({
          mode: z.literal('local'),
          localEndpoint: LocalEndpointSchema
        })
      ])
    })
  }),
  z.object({
    section: z.literal('display'),
    updates: z.object({
      display: z.object({
        aiExplanationMode: z.boolean()
      })
    })
  }),
  z.object({
    section: z.literal('notifications'),
    updates: z.object({
      notifications: NotificationSettingsSchema.partial()
    })
  }),
  z.object({
    section: z.literal('data'),
    updates: z.object({
      data: z.object({
        cleanupDays: z.number().int().positive().or(z.literal(-1)),
        destroyFeedback: z.boolean().optional()
      })
    })
  })
])

// Feedback types
export const FeedbackTypeSchema = z.enum([
  'accurate',
  'content_error',
  'priority_error',
  'not_actionable',
  'source_error'
])

// Feedback submission
export const FeedbackRequestSchema = z.object({
  itemId: z.string(),
  type: FeedbackTypeSchema
})

// Inline edit request (P2)
export const InlineEditRequestSchema = z.object({
  itemId: z.string(),
  field: z.enum(['title', 'description', 'dueDate', 'priority']),
  value: z.union([
    z.string().min(1).max(200),  // title
    z.string().max(500),          // description
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // dueDate
    PrioritySchema                // priority
  ])
})
```

---

## Data Retention Schemas

```typescript
// Retention period
export const RetentionPeriodSchema = z.number().int().positive().or(z.literal(-1))

// Cleanup operation
export const CleanupRequestSchema = z.object({
  type: z.enum(['30-days', 'custom']),
  customDateRange: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  }).optional()
})

// Confirmation phrase
export const DestroyFeedbackConfirmationSchema = z.string()
  .refine((val) => val === '确认删除', { message: "请输入 '确认删除' 以继续" })
```

---

## Usage Example

### Main Process Handler

```typescript
import { ipcMain } from 'electron'
import { OnboardingStep1Schema, OnboardingStep2Schema, OnboardingStep3Schema } from '@shared/schemas/onboarding'

ipcMain.handle('onboarding:set-step', async (event, request) => {
  // Validate request
  const validated = await z.object({
    step: z.number().int().min(1).max(3),
    data: z.union([
      OnboardingStep1Schema,
      OnboardingStep2Schema,
      OnboardingStep3Schema
    ]).optional()
  }).parseAsync(request)

  // Process request
  const result = await handleSetStep(validated.step, validated.data)

  return { success: true, ...result }
})
```

### Renderer Process Client

```typescript
import { z } from 'zod'
import { OnboardingStep1Schema } from '@shared/schemas/onboarding'

class OnboardingService {
  async setStep1(data: z.infer<typeof OnboardingStep1Schema>) {
    const validated = OnboardingStep1Schema.parse(data)

    return ipcRenderer.invoke('onboarding:set-step', {
      step: 1,
      data: validated
    })
  }
}
```

**Ready for Phase 1: Quickstart Guide** ✓
