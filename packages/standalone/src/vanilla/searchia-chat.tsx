import { h, render } from "preact";
import {
  MockSearchiaAdapter,
  SearchiaApiAdapter,
} from "../searchia/mock-adapter";
import SearchiaChatExperience from "../searchia/searchia-chat";
import type { SearchiaChatConfig } from "../searchia/types";
import { resolveContainerElement } from "./resolve-container-element";

export type SearchiaChatInitOptions = SearchiaChatConfig & {
  container?: string | HTMLElement;
};

let defaultMountPoint: HTMLElement | null = null;

/**
 * Initializes and mounts the Searchia AI Chat widget.
 * Framework-independent: works in any vanilla JS or HTML environment without an iframe.
 */
export function init({
  container,
  ...config
}: SearchiaChatInitOptions = {}): void {
  let containerElement: HTMLElement | null = null;

  if (container) {
    containerElement = resolveContainerElement(container);
    if (!containerElement) {
      throw new Error(
        `[SearchiaChat] Specified container element not found: "${container}"`,
      );
    }
  } else {
    // If no container specified, auto-mount to document.body
    if (typeof document !== "undefined") {
      if (!defaultMountPoint || !document.body.contains(defaultMountPoint)) {
        defaultMountPoint = document.createElement("div");
        defaultMountPoint.id = "searchia-chat-widget-root";
        document.body.appendChild(defaultMountPoint);
      }
      containerElement = defaultMountPoint;
    }
  }

  if (!containerElement) {
    throw new Error("[SearchiaChat] DOM not available to mount widget.");
  }

  render(h(SearchiaChatExperience, config), containerElement);
}

/**
 * Unmounts and tears down the Searchia AI Chat widget.
 */
export function destroy(container?: string | HTMLElement): void {
  const containerElement = container
    ? resolveContainerElement(container)
    : defaultMountPoint;

  if (!containerElement) return;

  render(null, containerElement);

  if (containerElement === defaultMountPoint && defaultMountPoint.parentNode) {
    defaultMountPoint.parentNode.removeChild(defaultMountPoint);
    defaultMountPoint = null;
  }
}

export { MockSearchiaAdapter, SearchiaApiAdapter };
export type {
  SearchiaChatAdapter,
  SearchiaChatConfig,
  SearchiaLanguage,
} from "../searchia/types";

export default {
  init,
  destroy,
  MockSearchiaAdapter,
  SearchiaApiAdapter,
};
