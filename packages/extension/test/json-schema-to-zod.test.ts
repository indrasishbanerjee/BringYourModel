import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Mirror of OpenModelRouter.convertJsonSchemaToZod object handling for regression tests.
 */
function objectSchemaFromJsonSchema(schema: {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  const requiredKeys = new Set(schema.required ?? []);

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    const prop = propSchema as { type: string };
    let fieldSchema: z.ZodTypeAny =
      prop.type === 'string'
        ? z.string()
        : prop.type === 'number'
          ? z.number()
          : z.any();
    if (!requiredKeys.has(key)) {
      fieldSchema = fieldSchema.optional();
    }
    shape[key] = fieldSchema;
  }

  return z.object(shape);
}

describe('JSON Schema required → Zod optional', () => {
  const invoiceSchema = {
    type: 'object' as const,
    properties: {
      invoiceNumber: { type: 'string' },
      vendor: { type: 'string' },
      total: { type: 'number' },
    },
  };

  it('accepts partial objects when no required array is set', () => {
    const zodSchema = objectSchemaFromJsonSchema(invoiceSchema);
    const kimiOutput = {
      invoiceNumber: 'INV-2024-0892',
      vendor: 'CloudHost Pro',
      totalDue: 485.43,
      lineItems: [],
    };

    expect(zodSchema.safeParse(kimiOutput).success).toBe(true);
  });

  it('rejects missing fields listed in required', () => {
    const zodSchema = objectSchemaFromJsonSchema({
      ...invoiceSchema,
      required: ['invoiceNumber', 'total'],
    });

    expect(
      zodSchema.safeParse({
        invoiceNumber: 'INV-1',
        vendor: 'Acme',
        totalDue: 10,
      }).success
    ).toBe(false);

    expect(
      zodSchema.safeParse({
        invoiceNumber: 'INV-1',
        total: 10,
      }).success
    ).toBe(true);
  });
});
