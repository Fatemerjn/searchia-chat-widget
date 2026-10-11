import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "../components/search-askai/chat";
import type { SuggestedQuestionHit } from "../components/search-askai/use-suggested-questions";
import type { SearchiaLanguage } from "./i18n";
import type {
  SearchiaChatAdapter,
  SearchiaChatMessage,
  SuggestedQuestionItem,
} from "./types";

interface UseSearchiaChatProps {
  adapter: SearchiaChatAdapter;
  language: SearchiaLanguage;
  suggestedQuestionsEnabled?: boolean;
  customSuggestedQuestions?: string[];
}

export function useSearchiaChat({
  adapter,
  language,
  suggestedQuestionsEnabled = true,
  customSuggestedQuestions,
}: UseSearchiaChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<
    SuggestedQuestionHit[]
  >([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const historyRef = useRef<SearchiaChatMessage[]>([]);

  // Load suggested questions
  useEffect(() => {
    let active = true;
    setSuggestedQuestions([]);
    if (!suggestedQuestionsEnabled) {
      setSuggestedQuestions([]);
      return;
    }

    if (customSuggestedQuestions && customSuggestedQuestions.length > 0) {
      setSuggestedQuestions(
        customSuggestedQuestions.map((q, idx) => ({
          objectID: `custom-${idx}`,
          question: q,
          appId: "searchia",
          assistantId: "searchia-agent",
          state: "published" as const,
          source: "custom",
          order: idx,
        })),
      );
      return;
    }

    if (adapter.getSuggestedQuestions) {
      adapter
        .getSuggestedQuestions(language)
        .then((items: SuggestedQuestionItem[]) => {
          if (!active) return;
          setSuggestedQuestions(
            items.map((item, idx) => ({
              objectID: item.id || `sq-${idx}`,
              question: item.question,
              appId: "searchia",
              assistantId: "searchia-agent",
              state: "published" as const,
              source: "adapter",
              order: idx,
            })),
          );
        })
        .catch((err) => {
          console.warn(
            "[SearchiaChat] Failed to load suggested questions:",
            err,
          );
        });
    }
    return () => {
      active = false;
    };
  }, [adapter, language, suggestedQuestionsEnabled, customSuggestedQuestions]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);

  const startNewConversation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    historyRef.current = [];
    setMessages([]);
    setError(null);
    setIsGenerating(false);
  }, []);

  const sendMessage = useCallback(
    async ({ text }: { text: string }) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating || abortControllerRef.current) return;

      setError(null);
      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;

      const userMessage: Message = {
        id: userMessageId,
        role: "user",
        parts: [{ type: "text", text: trimmed }],
      } as unknown as Message;

      // Add user message to state
      setMessages((prev) => [...prev, userMessage]);
      setIsGenerating(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Append user message to history
      historyRef.current.push({
        id: userMessageId,
        role: "user",
        content: trimmed,
        createdAt: new Date(),
      });

      let assistantHasAppeared = false;
      let fullAssistantText = "";

      try {
        const result = await adapter.sendMessage({
          language,
          prompt: trimmed,
          history: [...historyRef.current],
          signal: controller.signal,
          onChunk: (_chunk: string, accumulated: string) => {
            if (controller.signal.aborted) return;
            fullAssistantText = accumulated;
            setMessages((prev) => {
              if (!assistantHasAppeared) {
                assistantHasAppeared = true;
                const assistantMessage: Message = {
                  id: assistantMessageId,
                  role: "assistant",
                  parts: [{ type: "text", text: accumulated }],
                } as unknown as Message;
                return [...prev, assistantMessage];
              }

              return prev.map((m) =>
                m.id === assistantMessageId
                  ? ({
                      ...m,
                      parts: [{ type: "text", text: accumulated }],
                    } as unknown as Message)
                  : m,
              );
            });
          },
        });

        if (controller.signal.aborted) return;
        fullAssistantText = result;
        if (assistantHasAppeared) {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMessageId
                ? { ...message, parts: [{ type: "text", text: result }] }
                : message,
            ),
          );
        }

        // If onChunk was never called (e.g. non-streaming response), ensure message is added
        if (!assistantHasAppeared && fullAssistantText) {
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            parts: [{ type: "text", text: fullAssistantText }],
          } as unknown as Message;
          setMessages((prev) => [...prev, assistantMessage]);
        }

        // Save assistant response to history
        historyRef.current.push({
          id: assistantMessageId,
          role: "assistant",
          content: fullAssistantText,
          createdAt: new Date(),
        });
      } catch (err: unknown) {
        if (
          !controller.signal.aborted &&
          (err as Error)?.name !== "AbortError"
        ) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setIsGenerating(false);
          abortControllerRef.current = null;
        }
      }
    },
    [adapter, language, isGenerating],
  );

  const handleFeedback = useCallback(
    async (messageId: string, vote: 1 | 0) => {
      if (adapter.sendFeedback) {
        try {
          const userIndex = historyRef.current.findIndex(
            (message) => message.id === messageId,
          );
          const assistantId =
            historyRef.current[userIndex + 1]?.id ?? messageId;
          await adapter.sendFeedback(assistantId, vote);
        } catch (err) {
          console.warn("[SearchiaChat] Feedback failed:", err);
          throw err;
        }
      }
    },
    [adapter],
  );

  return {
    messages,
    isGenerating,
    error,
    suggestedQuestions,
    sendMessage,
    startNewConversation,
    handleFeedback,
  };
}
