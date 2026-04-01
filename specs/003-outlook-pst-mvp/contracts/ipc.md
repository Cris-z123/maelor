# IPC Contract: Outlook PST Direct-Connect MVP

## Onboarding

### `onboarding.getStatus`

Returns:

```ts
{
  completed: boolean;
  currentStep: 1 | 2 | 3;
  outlookDirectory: string | null;
  readablePstCount: number;
}
```

### `onboarding.detectOutlookDir`

Returns:

```ts
{
  detectedPath: string | null;
  reason: string;
}
```

### `onboarding.validateOutlookDir`

Input:

```ts
{
  directoryPath: string;
}
```

Returns:

```ts
{
  valid: boolean;
  readablePstCount: number;
  unreadablePstCount: number;
  files: Array<{
    path: string;
    fileName: string;
    sizeBytes: number;
    modifiedAt: number;
    readability: "readable" | "unreadable";
    reason: string | null;
  }>;
  message: string;
}
```

### `onboarding.testConnection`

Input:

```ts
{
  baseUrl: string;
  apiKey: string;
  model: string;
}
```

Returns:

```ts
{
  success: boolean;
  responseTimeMs: number | null;
  message: string;
}
```

### `onboarding.complete`

Input:

```ts
{
  directoryPath: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}
```

Returns:

```ts
{
  success: boolean;
}
```

## Runs

### `runs.start`

Returns:

```ts
{
  success: boolean;
  runId: string | null;
  message: string;
}
```

### `runs.getLatest`

Returns:

```ts
ExtractionRunDetail | null
```

### `runs.getById`

Input:

```ts
{
  runId: string;
}
```

Returns:

```ts
ExtractionRunDetail
```

### `runs.listRecent`

Input:

```ts
{
  limit?: number;
}
```

Returns:

```ts
Array<{
  runId: string;
  startedAt: number;
  status: "pending" | "running" | "completed" | "failed";
  pstCount: number;
  processedEmailCount: number;
  itemCount: number;
}>
```

## Settings

### `settings.get`

Returns:

```ts
{
  outlookDirectory: string;
  aiBaseUrl: string;
  aiModel: string;
}
```

### `settings.update`

Input:

```ts
{
  outlookDirectory?: string;
  aiBaseUrl?: string;
  apiKey?: string;
  aiModel?: string;
}
```

Returns:

```ts
{
  success: boolean;
}
```

### `settings.getDataSummary`

Returns:

```ts
{
  databasePath: string;
  databaseSizeBytes: number;
}
```

### `settings.clearRuns`

Returns:

```ts
{
  success: boolean;
  deletedRunCount: number;
}
```

### `settings.rebuildIndex`

Returns:

```ts
{
  success: boolean;
  message: string;
}
```
