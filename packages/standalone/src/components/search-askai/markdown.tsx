import { memo, useEffect, useMemo, useRef } from "react";
import { parseMarkdownToSafeHtml } from "./utils/markdown";

interface MemoizedMarkdownProps {
  children: string;
  labels?: {
    copyCode: string;
    copy: string;
    copied: string;
    copyError: string;
  };
  autoDirection?: boolean;
  className?: string;
}

export const MemoizedMarkdown = memo(function MemoizedMarkdown({
  children,
  labels,
  autoDirection = false,
  className = "",
}: MemoizedMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // HTML is produced by parseMarkdownToSafeHtml (escapes raw HTML, sanitizes URLs).
  // eslint-disable-next-line xss/no-mixed-html -- sanitized via parseMarkdownToSafeHtml
  const html = useMemo(() => parseMarkdownToSafeHtml(children), [children]);

  // Handle copy button clicks
  // biome-ignore lint/correctness/useExhaustiveDependencies: expected
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLabels = (button: HTMLButtonElement, copied = false) => {
      if (!labels) return;
      button.setAttribute(
        "aria-label",
        copied ? labels.copied : labels.copyCode,
      );
      button.title = copied ? labels.copied : labels.copyCode;
      const text = button.querySelector(".ss-markdown-copy-label");
      if (text) text.textContent = copied ? labels.copied : labels.copy;
    };
    container
      .querySelectorAll<HTMLButtonElement>(".ss-markdown-copy-button")
      .forEach((button) => updateLabels(button));
    if (autoDirection) {
      container
        .querySelectorAll("p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote")
        .forEach((element) => element.setAttribute("dir", "auto"));
      container
        .querySelectorAll("pre, code")
        .forEach((element) => element.setAttribute("dir", "ltr"));
    }
    const handleCopyClick = async (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest(
        ".ss-markdown-copy-button",
      ) as HTMLButtonElement;

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      const encodedCode = button.getAttribute("data-code");
      if (!encodedCode) return;

      try {
        const code = decodeURIComponent(encodedCode);
        await navigator.clipboard.writeText(code);

        // Show success state
        button.classList.add("ss-markdown-copied");
        updateLabels(button, true);

        // Reset after 2 seconds
        setTimeout(() => {
          button.classList.remove("ss-markdown-copied");
          updateLabels(button);
        }, 2000);
      } catch (error) {
        if (labels) {
          button.title = labels.copyError;
          button.setAttribute("aria-label", labels.copyError);
        }
        console.error("Failed to copy code:", error);
      }
    };

    container.addEventListener("click", handleCopyClick);

    return () => {
      container.removeEventListener("click", handleCopyClick);
    };
  }, [html, labels, autoDirection]);

  return (
    <div
      ref={containerRef}
      className={`ss-markdown-content ${className}`.trim()}
      // eslint-disable-next-line xss/no-mixed-html -- sanitized via parseMarkdownToSafeHtml
      // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML is sanitized via parseMarkdownToSafeHtml
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
