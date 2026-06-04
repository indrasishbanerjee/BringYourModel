export type RecipeCategory = 'setup' | 'text' | 'structured' | 'conversation';

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  setup: 'Getting started',
  text: 'Text generation',
  structured: 'Structured data',
  conversation: 'Conversation',
};

export type RecipeKind =
  | 'extension-check'
  | 'code-only'
  | 'ask-summarize'
  | 'ask-draft'
  | 'stream'
  | 'classify'
  | 'extract'
  | 'embed-faq'
  | 'chat-send'
  | 'chat-stream';

export interface RecipeDefaults {
  input?: string;
  inputSecondary?: string;
  categories?: string;
  extractSchema?: string;
  systemMessage?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  category: RecipeCategory;
  kind: RecipeKind;
  code: string;
  defaults: RecipeDefaults;
  runLabel?: string;
  codeOnly?: boolean;
}

export interface ResponseMetadata {
  model?: string;
  provider?: string;
  costUSD?: number;
  latencyMs?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    tokens?: number;
  };
}

export interface RecipeRunResult {
  text: string;
  metadata?: ResponseMetadata;
  monospace?: boolean;
}

export interface RecipeFormState {
  input: string;
  inputSecondary: string;
  categories: string;
  extractSchema: string;
  systemMessage: string;
}
