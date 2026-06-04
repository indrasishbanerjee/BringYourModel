import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

/**
 * Create an Ollama provider instance
 */
export function createOllamaProvider(options: { baseURL: string }) {
  return createOpenAICompatible({
    name: 'ollama',
    baseURL: `${options.baseURL}/v1`,
    headers: {},
  });
}

/**
 * Test Ollama connection and list available models
 */
export async function testOllamaConnection(baseURL: string): Promise<{
  success: boolean;
  error?: string;
  models?: string[];
}> {
  try {
    const response = await fetch(`${baseURL}/api/tags`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      models: data.models?.map((m: any) => m.name) || [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to Ollama',
    };
  }
}

/**
 * Pull a model from Ollama
 */
export async function pullOllamaModel(
  baseURL: string,
  model: string,
  onProgress?: (progress: { completed?: number; total?: number; status: string }) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${baseURL}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: model }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Handle streaming response for progress
    const reader = response.body?.getReader();
    if (reader && onProgress) {
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            onProgress({
              completed: data.completed,
              total: data.total,
              status: data.status,
            });
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to pull model',
    };
  }
}