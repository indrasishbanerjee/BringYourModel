import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatSession, type Message } from '@byomsdk/sdk';
import type { Recipe, RecipeFormState, RecipeRunResult } from '../examples/types';
import { formFromDefaults, formatError, runRecipe } from '../examples/runners';

export function useRecipeRunner(recipe: Recipe) {
  const [form, setForm] = useState<RecipeFormState>(() => formFromDefaults(recipe.defaults));
  const [result, setResult] = useState<RecipeRunResult | null>(null);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const chatSessionRef = useRef<ChatSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resetForRecipe = useCallback((next: Recipe) => {
    chatSessionRef.current?.close();
    chatSessionRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
    setForm(formFromDefaults(next.defaults));
    setResult(null);
    setStreamedText('');
    setError(null);
    setIsLoading(false);
    setIsStreaming(false);
    setChatMessages([]);
  }, []);

  useEffect(() => {
    resetForRecipe(recipe);
  }, [recipe, resetForRecipe]);

  const loadSample = useCallback(() => {
    setForm(formFromDefaults(recipe.defaults));
    setError(null);
  }, [recipe.defaults]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const run = useCallback(async () => {
    if (recipe.codeOnly) return;

    setError(null);
    setResult(null);
    setStreamedText('');

    const isStreamKind = recipe.kind === 'stream' || recipe.kind === 'chat-stream';
    if (isStreamKind) {
      setIsStreaming(true);
    } else {
      setIsLoading(true);
    }

    abortRef.current = new AbortController();

    try {
      if (recipe.kind === 'extract') {
        JSON.parse(form.extractSchema);
      }

      const { result: runResult, chatSession, chatMessages: messages } = await runRecipe(
        recipe,
        form,
        chatSessionRef.current,
        abortRef.current.signal,
        (text) => setStreamedText(text)
      );

      chatSessionRef.current = chatSession;
      if (messages) setChatMessages(messages);
      setResult(runResult);
      if (isStreamKind) setStreamedText('');
    } catch (e) {
      if (e instanceof SyntaxError) {
        setError('Invalid JSON schema');
      } else {
        setError(formatError(e));
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [recipe, form]);

  const updateForm = useCallback((patch: Partial<RecipeFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const canRun =
    !recipe.codeOnly &&
    (recipe.kind === 'extension-check' ||
      form.input.trim().length > 0 ||
      (recipe.kind === 'embed-faq' && form.inputSecondary.trim().length > 0));

  return {
    form,
    updateForm,
    result,
    streamedText,
    error,
    isLoading,
    isStreaming,
    chatMessages,
    loadSample,
    run,
    cancel,
    canRun,
  };
}
