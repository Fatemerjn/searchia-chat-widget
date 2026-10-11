import { defineConfig } from "rolldown";
import { dts } from "rolldown-plugin-dts";
import postcss from "rollup-plugin-postcss";

// Scope reused CSS only in the Searchia output; preserve original bundle selectors.
const searchiaScope = {
  postcssPlugin: "searchia-scope",
  Once(root) {
    root.walkAtRules(/keyframes$/i, (rule) => {
      rule.params = `searchia-${rule.params}`;
    });
    root.walkDecls(/^animation(?:-name)?$/, (declaration) => {
      declaration.value = declaration.value.replace(
        /\b(shimmer|ss-fade-in|ss-copied-pop|modalEnter)\b/g,
        "searchia-$1",
      );
    });
    root.walkRules((rule) => {
      if (
        rule.parent?.type === "atrule" &&
        /keyframes$/i.test(rule.parent.name)
      )
        return;
      rule.selectors = rule.selectors.flatMap((selector) => {
        if (selector.startsWith(".searchia-widget")) return [selector];
        if (selector.includes(".ssask-exp"))
          return [
            selector.replace(
              ".ssask-exp",
              ".ssask-exp:where(.searchia-widget)",
            ),
          ];
        return [
          `:where(.searchia-widget) ${selector}`,
          `${selector}:where(.searchia-widget)`,
        ];
      });
    });
  },
};

const common = {
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  external: [],
  resolve: {
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react/jsx-runtime": "preact/jsx-runtime",
    },
  },
  inlineDynamicImports: true,
  treeshake: { moduleSideEffects: false },
};

export default defineConfig([
  {
    input: "src/vanilla/search.tsx",
    output: {
      dir: "dist",
      entryFileNames: "search.min.js",
      format: "umd",
      name: "SiteSearch",
      sourcemap: true,
      minify: true,
    },
    plugins: [
      postcss({
        extract: "search.min.css",
      }),
    ],
    ...common,
  },
  {
    input: "src/vanilla/search-askai.tsx",
    output: {
      dir: "dist",
      entryFileNames: "search-askai.min.js",
      format: "umd",
      name: "SiteSearchAskAI",
      sourcemap: true,
      minify: true,
    },
    plugins: [
      postcss({
        extract: "search-askai.min.css",
      }),
    ],
    ...common,
  },
  {
    input: "src/vanilla/sidepanel-askai.tsx",
    output: {
      dir: "dist",
      entryFileNames: "sidepanel-askai.min.js",
      format: "umd",
      name: "SiteSearchSidepanelAskAI",
      sourcemap: true,
      minify: true,
    },
    plugins: [
      postcss({
        extract: "sidepanel-askai.min.css",
      }),
    ],
    ...common,
  },
  {
    input: "src/vanilla/searchia-chat.tsx",
    output: {
      dir: "dist",
      entryFileNames: "searchia-chat.min.js",
      format: "umd",
      name: "SearchiaChat",
      sourcemap: true,
      minify: true,
    },
    plugins: [
      postcss({
        extract: "searchia-chat.min.css",
        plugins: [searchiaScope],
      }),
    ],
    ...common,
  },
  {
    input: "src/index.ts",
    output: { dir: "dist", format: "es" },
    plugins: [dts()],
    ...common,
  },
]);
