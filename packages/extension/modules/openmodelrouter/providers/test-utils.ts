import type { ConnectionTestResult } from './compatible';

export async function testModelsEndpoint(options: {
  url: string;
  headers?: Record<string, string>;
  parseModels?: (data: unknown) => string[];
}): Promise<ConnectionTestResult> {
  try {
    const response = await fetch(options.url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const models = options.parseModels
      ? options.parseModels(data)
      : Array.isArray((data as { data?: Array<{ id?: string }> }).data)
        ? (data as { data: Array<{ id?: string }> }).data.map((model) => model.id).filter(Boolean) as string[]
        : [];

    return { success: true, models };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    };
  }
}

export function assertConnectionSuccess(result: ConnectionTestResult): void {
  if (!result.success) {
    throw new Error(result.error || 'Connection test failed');
  }
}
