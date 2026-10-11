// Dependency-free verification using the existing TypeScript and PostCSS toolchain.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import postcss from "postcss";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), "searchia-check-"));
try {
  const dictionary = ts.transpileModule(
    await fs.readFile(path.join(root, "src/searchia/i18n.ts"), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.ESNext } },
  ).outputText;
  await fs.writeFile(path.join(temporary, "i18n.mjs"), dictionary);
  const { translations } = await import(path.join(temporary, "i18n.mjs"));
  assert.deepEqual(
    Object.keys(translations.fa).sort(),
    Object.keys(translations.en).sort(),
  );
  for (const value of Object.values(translations.fa)) assert.ok(value.trim());
  const source = await fs.readFile(
    path.join(root, "src/searchia/mock-adapter.ts"),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2021,
    },
  }).outputText;
  const modulePath = path.join(temporary, "mock.mjs");
  await fs.writeFile(modulePath, compiled);
  const { MockSearchiaAdapter } = await import(modulePath);
  const adapter = new MockSearchiaAdapter({ delayMs: 0 });
  for (const language of ["fa", "en"]) {
    const questions = await adapter.getSuggestedQuestions(language);
    assert.equal(questions.length, 3);
    assert.equal(
      /[\u0600-\u06ff]/.test(questions[0].question),
      language === "fa",
    );
    for (const question of questions) {
      let lastChunk = "";
      const response = await adapter.sendMessage({
        prompt: question.question,
        language,
        history: [],
        onChunk: (_chunk, accumulated) => {
          lastChunk = accumulated;
        },
      });
      assert.equal(response, lastChunk);
      assert.equal(/[\u0600-\u06ff]/.test(response), language === "fa");
      assert.ok(response.length > 100);
    }
    const response = await adapter.sendMessage({
      prompt: "markdown",
      language,
      history: [],
    });
    assert.ok(response.includes("```"));
  }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    adapter.sendMessage({
      prompt: "test",
      history: [],
      signal: controller.signal,
    }),
    { name: "AbortError" },
  );

  for (const file of ["sanitize", "markdown"]) {
    const input = await fs.readFile(
      path.join(root, `src/components/search-askai/utils/${file}.ts`),
      "utf8",
    );
    const output = ts
      .transpileModule(input, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2021,
        },
      })
      .outputText.replace('"./sanitize"', '"./sanitize.mjs"')
      .replace('"marked"', JSON.stringify(import.meta.resolve("marked")));
    await fs.writeFile(path.join(temporary, `${file}.mjs`), output);
  }
  const { parseMarkdownToSafeHtml } = await import(
    path.join(temporary, "markdown.mjs")
  );
  assert.ok(
    !parseMarkdownToSafeHtml("<script>alert(1)</script>").includes("<script>"),
  );
  assert.ok(
    !parseMarkdownToSafeHtml("[click](javascript:alert(1))").includes("<a "),
  );
  assert.ok(
    !parseMarkdownToSafeHtml("![x](javascript:alert(1))").includes("<img"),
  );
  const safeCode = parseMarkdownToSafeHtml(
    '```js\nconst text = "<script>";\n```',
  );
  assert.ok(safeCode.includes("&lt;script&gt;"));
  assert.ok(safeCode.includes("ss-markdown-copy-button"));

  // Verify the shipped stylesheet cannot style sibling Algolia widgets or host elements.
  const css = postcss.parse(
    await fs.readFile(path.join(root, "dist/searchia-chat.min.css"), "utf8"),
  );
  css.walkRules((rule) => {
    if (rule.parent.type === "atrule" && /keyframes$/i.test(rule.parent.name))
      return;
    for (const selector of rule.selectors)
      assert.ok(selector.includes(".searchia-widget"), selector);
  });
  css.walkAtRules(/keyframes$/i, (rule) =>
    assert.ok(rule.params.startsWith("searchia-")),
  );
  const legacyCss = await fs.readFile(
    path.join(root, "dist/search-askai.min.css"),
    "utf8",
  );
  assert.ok(!legacyCss.includes(".searchia-widget"));

  // UMD keeps the framework-independent public API available without loading a backend.
  const context = vm.createContext({ console, setTimeout, clearTimeout });
  vm.runInContext(
    await fs.readFile(path.join(root, "dist/searchia-chat.min.js"), "utf8"),
    context,
  );
  assert.equal(typeof context.SearchiaChat.init, "function");
  assert.equal(typeof context.SearchiaChat.destroy, "function");
  assert.equal(typeof context.SearchiaChat.MockSearchiaAdapter, "function");
  console.log(
    "PASS: bilingual mock samples, streaming, cancellation, Markdown safety, scoped CSS/keyframes, original CSS, and UMD exports.",
  );
} finally {
  await fs.rm(temporary, { recursive: true, force: true });
}
