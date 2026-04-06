interface ConnectionConfig {
    baseUrl: string;
    apiKey: string;
    model: string;
}

interface TestResult {
    success: boolean;
    responseTimeMs?: number;
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

            const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.model,
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

            const responseTimeMs = Date.now() - startTime;

            return {
                success: true,
                responseTimeMs,
                model,
            };
        } catch (error) {
            const responseTimeMs = Date.now() - startTime;

            if (error instanceof Error && error.name === 'AbortError') {
                return {
                    success: false,
                    error: `Connection timeout (${this.TIMEOUT_MS / 1000}s)`,
                    responseTimeMs,
                };
            }

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                responseTimeMs,
            };
        }
    }
}

export { ConnectionTester };
export default ConnectionTester;
