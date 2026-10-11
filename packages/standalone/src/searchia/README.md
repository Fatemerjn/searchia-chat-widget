Searchia widget localization
===========================

The framework-independent UMD entry remains `SearchiaChat.init(options)` and
`SearchiaChat.destroy(container?)`. All existing options remain supported.

```html
<link rel="stylesheet" href="searchia-chat.min.css" />
<script src="searchia-chat.min.js"></script>
<script>
  SearchiaChat.init({ language: "fa" });
</script>
```

Persian (`fa`) is the default; initialize with `en` for English. The panel's language
selector updates labels, direction, code-copy controls, and mock suggestions
without refreshing or clearing the conversation. Existing messages retain their
original content. Custom title, trigger text, placeholder, and suggested questions
are caller-owned strings and remain unchanged when switching languages.

`SendMessageOptions.language` and the optional argument to
`getSuggestedQuestions(language)` are UI locale hints. A custom adapter decides
whether to use them; switching UI language does not translate backend responses.
The default mock streams bilingual sample text and logs feedback locally.
`SearchiaApiAdapter` remains an unimplemented placeholder with no network calls.

Styles and animation names are scoped only in the Searchia bundle. The original
widget palette, typography, shadows, sparkle icons, and gradient logo have been
restored. Localization adds direction handling and the language selector without
replacing that theme. The footer mark remains inherited illustrative artwork,
not a verified official logo.

Run locally from the repository root:

```sh
npm run build --workspace @algolia/sitesearch
node apps/vanilla/scripts/link-sitesearch.mjs
python3 -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/apps/vanilla/searchia-demo.html. This page is independent
of the dashboard. To verify adapter behavior, Markdown safety, CSS scope, and UMD
exports after building:

```sh
node packages/standalone/scripts/verify-searchia.mjs
```

Verification status: all four UMD bundles and declarations build. Targeted Biome
checks and the programmatic verification pass. Default `tsc --noEmit` is blocked
by unresolved `instantsearch.js` and `bun:test` declarations in this checkout.
A temporary production-only type-check configuration passes when it resolves the
already installed InstantSearch package, excludes Bun test files, and uses ES2022
libraries required by the existing `Array.at` calls. No dependency changes were
made. Builds retain Rolldown's mixed named/default export warnings.

The independent demo, Persian initialization, localized labels, and suggestions
were observed in Chrome. Browser control then failed with `cgWindowNotFound`;
final styling, live switching, chat/copy/feedback interactions, and mobile visual
verification still need browser review. The programmatic check does not replace
those UI checks.
