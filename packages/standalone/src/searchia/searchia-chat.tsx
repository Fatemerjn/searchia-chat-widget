import type { FC } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatWidget } from "../components/search-askai/chat";
import {
  ChatSubmitIcon,
  CloseIcon,
  SparklesIcon,
  SquarePenIcon,
} from "../components/search-askai/icons";
import useEffectiveDarkMode from "../components/search-askai/useEffectiveDarkMode";
import { type SearchiaLanguage, translations } from "./i18n";
import { SearchiaLogo } from "./icons";
import { MockSearchiaAdapter } from "./mock-adapter";
import type { SearchiaChatAdapter, SearchiaChatConfig } from "./types";
import { useSearchiaChat } from "./use-searchia-chat";
import "../components/search-askai/styles.css";
import "../components/sidepanel-askai/sidepanel.css";
import "./searchia.css";

interface SearchiaChatInnerProps {
  config: SearchiaChatConfig;
  adapter: SearchiaChatAdapter;
  onClose: () => void;
  language: SearchiaLanguage;
  onLanguageChange: (language: SearchiaLanguage) => void;
}

const SearchiaChatInner: FC<SearchiaChatInnerProps> = memo(
  function SearchiaChatInner({
    config,
    adapter,
    onClose,
    language,
    onLanguageChange,
  }) {
    const t = translations[language];
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [input, setInput] = useState("");

    const {
      messages,
      isGenerating,
      error,
      suggestedQuestions,
      sendMessage,
      startNewConversation,
      handleFeedback,
    } = useSearchiaChat({
      adapter,
      language,
      suggestedQuestionsEnabled: config.suggestedQuestionsEnabled ?? true,
      customSuggestedQuestions: config.customSuggestedQuestions,
    });

    const handleSuggestedQuestionClick = useCallback(
      (question: string) => {
        const trimmed = question.trim();
        if (!trimmed || isGenerating) return;
        sendMessage({ text: trimmed });
      },
      [isGenerating, sendMessage],
    );

    const handleNewChat = useCallback(() => {
      startNewConversation();
      setInput("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }, [startNewConversation]);

    const submit = useCallback(() => {
      const trimmed = input.trim();
      if (!trimmed || isGenerating) return;
      sendMessage({ text: trimmed });
      setInput("");
    }, [input, isGenerating, sendMessage]);

    // Handle Escape key
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    // Focus input on mount
    useEffect(() => {
      requestAnimationFrame(() => inputRef.current?.focus());
    }, []);

    const placeholder = isGenerating
      ? t.answering
      : (config.placeholder ?? t.placeholder);

    return (
      <div className="ss-sidepanel-inner">
        <header className="ss-sidepanel-header">
          <div className="ss-sidepanel-title-group">
            <SparklesIcon
              size={20}
              gradientIdSuffix="-sp-hdr"
              className="ss-sidepanel-title-sparkle"
            />
            <h2 className="ss-sidepanel-title">{config.title ?? t.title}</h2>
            {adapter.isMock && (
              <span className="searchia-badge-mock" title={t.mockTitle}>
                {t.mock}
              </span>
            )}
          </div>
          <div className="ss-sidepanel-header-actions">
            <select
              className="searchia-language"
              aria-label={t.language}
              value={language}
              onChange={(event) =>
                onLanguageChange(event.currentTarget.value as SearchiaLanguage)
              }
            >
              <option value="fa">فارسی</option>
              <option value="en">English</option>
            </select>
            <button
              type="button"
              className="ss-search-new-chat-button"
              disabled={isGenerating}
              title={t.newChat}
              aria-label={t.newChat}
              onClick={handleNewChat}
            >
              <SquarePenIcon size={18} />
            </button>
            <button
              type="button"
              className="ss-search-close-button"
              onClick={onClose}
              aria-label={t.close}
              title={t.close}
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className="ss-sidepanel-body">
          <ChatWidget
            labels={t}
            autoDirection
            messages={messages}
            error={error}
            isGenerating={isGenerating}
            applicationId="searchia"
            assistantId="searchia-agent"
            suggestedQuestions={suggestedQuestions}
            onSuggestedQuestionClick={handleSuggestedQuestionClick}
            onNewChat={handleNewChat}
            onThumbsUp={(msgId) => handleFeedback(msgId, 1)}
            onThumbsDown={(msgId) => handleFeedback(msgId, 0)}
            showPromptBlockingError={false}
            threadDepthBannerInChat={false}
            showAiDisclaimer={false}
            newestExchangeFirst={false}
          />
        </div>

        <div className="ss-sidepanel-compose-stack">
          <footer className="ss-sidepanel-footer">
            <search
              className="ss-searchbox-form ss-searchbox-form--chat ss-sidepanel-compose-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                ref={inputRef}
                dir="auto"
                aria-label={t.placeholder}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={512}
                type="search"
                placeholder={placeholder}
                value={input}
                disabled={isGenerating}
                onChange={(e) => setInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
              <button
                type="submit"
                className="ss-search-submit-chat-button"
                disabled={isGenerating || !input.trim()}
                title={t.send}
                aria-label={t.send}
              >
                <ChatSubmitIcon size={22} />
              </button>
            </search>

            <div className="ss-sidepanel-ai-notice">
              <p className="ss-sidepanel-ai-notice-text">{t.disclaimer}</p>
            </div>

            <div className="ss-sidepanel-powered-by">
              <span className="searchia-powered-by-link">
                <span className="ss-sidepanel-powered-by-label">
                  {t.poweredBy}
                </span>
                <SearchiaLogo size={18} />
              </span>
            </div>
          </footer>
        </div>
      </div>
    );
  },
);

export default function SearchiaChatExperience(
  config: SearchiaChatConfig = {},
) {
  const [language, setLanguage] = useState<SearchiaLanguage>(
    config.language ?? "fa",
  );
  const t = translations[language];
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);
  const [open, setOpen] = useState(false);
  const isDark = useEffectiveDarkMode(config.darkMode);
  const triggerPosition = config.triggerPosition ?? "fixed";

  const adapter = useMemo(() => {
    return config.adapter ?? new MockSearchiaAdapter();
  }, [config.adapter]);

  return (
    <div
      lang={language}
      dir={language === "fa" ? "rtl" : "ltr"}
      className={`searchia-widget ssask-exp ss-sidepanel-root ss-sidepanel-root--${triggerPosition}${
        isDark ? " dark" : ""
      }`}
    >
      <button
        type="button"
        ref={triggerRef}
        className="ss-sidepanel-trigger"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <SparklesIcon size={18} />
        <span>{config.buttonText ?? t.button}</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <button
              type="button"
              className="searchia-widget ss-sidepanel-backdrop"
              aria-label={t.close}
              onClick={close}
            />
            <div
              lang={language}
              dir={language === "fa" ? "rtl" : "ltr"}
              aria-label={config.title ?? t.title}
              className={`searchia-widget ss-sidepanel-panel ssask-exp${isDark ? " dark" : ""}`}
              role="dialog"
              aria-modal="true"
              onKeyDown={(event) => {
                if (event.key !== "Tab") return;
                const controls = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not(:disabled), input:not(:disabled), select, a[href]",
                  ),
                );
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }}
            >
              <SearchiaChatInner
                config={config}
                adapter={adapter}
                language={language}
                onLanguageChange={setLanguage}
                onClose={close}
              />
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
