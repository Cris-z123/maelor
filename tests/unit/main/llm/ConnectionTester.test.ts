import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ConnectionTester', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers();
  });

  it('should successfully connect to remote LLM endpoint', async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ model: 'gpt-4' }),
      } as Response)
    );
    global.fetch = mockFetch;

    const { ConnectionTester } = await import('@/llm/ConnectionTester');

    const result = await ConnectionTester.testConnection({
      mode: 'remote',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key-with-at-least-20-chars',
    });

    expect(result.success).toBe(true);
    expect(result.responseTime).toBeGreaterThanOrEqual(0);
    expect(result.model).toBe('gpt-4');
  });

  it('should timeout after 30 seconds', async () => {
    // Mock fetch to reject with AbortError (simulating timeout)
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    global.fetch = vi.fn(() => Promise.reject(abortError));

    const { ConnectionTester } = await import('@/llm/ConnectionTester');

    const result = await ConnectionTester.testConnection({
      mode: 'remote',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key-with-at-least-20-chars',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });

  it('should handle network errors', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

    const { ConnectionTester } = await import('@/llm/ConnectionTester');

    const result = await ConnectionTester.testConnection({
      mode: 'remote',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-test-key-with-at-least-20-chars',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });

  it('should handle HTTP error responses', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as Response)
    );

    const { ConnectionTester } = await import('@/llm/ConnectionTester');

    const result = await ConnectionTester.testConnection({
      mode: 'remote',
      endpoint: 'https://api.openai.com/v1',
      apiKey: 'sk-invalid-key',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('HTTP 401: Unauthorized');
  });
});
