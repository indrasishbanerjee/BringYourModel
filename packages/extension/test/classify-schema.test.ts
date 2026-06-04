import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const categories = ['billing', 'technical', 'sales', 'other'] as const;

const classifyObjectSchema = z.object({
  category: z.enum(categories),
  confidence: z.number().min(0).max(1).optional(),
});

describe('classify generateObject schema', () => {
  it('accepts Kimi-style response with category only', () => {
    const parsed = classifyObjectSchema.safeParse({ category: 'technical' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.confidence ?? 1).toBe(1);
    }
  });

  it('accepts full response with confidence', () => {
    const parsed = classifyObjectSchema.safeParse({
      category: 'billing',
      confidence: 0.92,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.confidence).toBe(0.92);
    }
  });
});
