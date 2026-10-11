import type { SearchiaLanguage } from "./i18n";

export type { SearchiaLanguage } from "./i18n";
/**
 * Searchia Chat Types & Adapter Interfaces
 * -----------------------------------------
 * Framework-independent definitions for Searchia's Agent Studio chat widget.
 */

export interface SearchiaChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
}

export interface SuggestedQuestionItem {
  id: string;
  question: string;
}

export interface SendMessageOptions {
  /** The current message prompt sent by the user */
  prompt: string;
  /** UI locale hint; adapters decide response language independently. */
  language?: SearchiaLanguage;
  /** Full conversation history leading up to this message */
  history: SearchiaChatMessage[];
  /** Callback invoked incrementally when streaming tokens are received */
  onChunk?: (chunk: string, fullText: string) => void;
  /** Signal used to abort / cancel generation if the user resets or stops */
  signal?: AbortSignal;
}

export interface SearchiaChatAdapter {
  /** Identifying name of the adapter implementation */
  readonly name: string;
  /** True if this is a simulated/mock adapter; false if communicating with a real backend */
  readonly isMock: boolean;

  /**
   * Sends a user query to the Searchia Agent API or mock engine.
   * Returns the final completed text response.
   */
  sendMessage(options: SendMessageOptions): Promise<string>;

  /**
   * Retrieves suggested starter questions for the empty state.
   */
  getSuggestedQuestions?(
    language?: SearchiaLanguage,
  ): Promise<SuggestedQuestionItem[]>;

  /**
   * Submits user feedback (thumbs up / thumbs down) for an assistant response.
   */
  sendFeedback?(messageId: string, vote: 1 | 0): Promise<void>;
}

export interface SearchiaChatConfig {
  /** Initial UI language. Defaults to Persian; switchable inside the widget. */
  language?: SearchiaLanguage;
  /**
   * Custom chat adapter instance. If omitted, MockSearchiaAdapter is used by default.
   */
  adapter?: SearchiaChatAdapter;

  /**
   * Trigger button display text (defaults to localized "Ask Searchia")
   */
  buttonText?: string;

  /**
   * Header title display text (defaults to localized "Searchia AI")
   */
  title?: string;

  /**
   * Input placeholder text (defaults to localized "Ask Searchia anything...")
   */
  placeholder?: string;

  /**
   * Positioning of the trigger button: "fixed" (bottom-right viewport) or "inline" (inside container)
   * Defaults to "fixed".
   */
  triggerPosition?: "fixed" | "inline";

  /**
   * Explicit dark mode setting. If undefined, follows HTML class or system preference.
   */
  darkMode?: boolean;

  /**
   * Whether to show suggested questions in the welcome state (defaults to true)
   */
  suggestedQuestionsEnabled?: boolean;

  /**
   * Optional custom static suggested questions to override adapter suggestions
   */
  customSuggestedQuestions?: string[];
}
