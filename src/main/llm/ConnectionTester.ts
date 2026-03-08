interface ConnectionConfig {
  mode: 'local' | 'remote';
  endpoint: string;
  apiKey?: string;
}

interface TestResult {
  success: boolean;
  responseTime?: number;
  model?: string;
  error?: string;
}

class ConnectionTester {
  private static readonly TIMEOUT_MS = 30000;

  static async testConnection(config: ConnectionConfig): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (config.mode === 'remote' && config.apiKey) {
        headers['Authorization'] = `Bearer ${config.apiKey}`;
      }

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      let model: string | undefined;
      try {
        const data = await response.json();
        model = data.model || data.id;
      } catch {
        // Ignore JSON parse errors
      }

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        responseTime,
        model,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: `Connection timeout (${this.TIMEOUT_MS / 1000}s)`,
          responseTime,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime,
      };
    }
  }
}

export { ConnectionTester };
export default ConnectionTester;
