import { codeToHtml, type BundledLanguage } from "shiki";

interface CodeBlockProps {
  code: string;
  language: string;
}

export async function CodeBlock({ code, language }: CodeBlockProps) {
  if (!code) {
    return (
      <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-4">
        <p className="text-(--text-muted) text-sm">No content</p>
      </div>
    );
  }

  let html: string;
  try {
    html = await codeToHtml(code, {
      lang: (language || "text") as BundledLanguage,
      theme: "vitesse-dark",
    });
  } catch {
    html = `<pre><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
  }

  const lines = code.split("\n");
  const lineCount = lines.length;
  const lineNumberWidth = String(lineCount).length;

  return (
    <div className="rounded-xl border border-(--border-subtle) bg-(--bg-surface) overflow-hidden">
      <div className="flex overflow-auto">
        <div
          className="shrink-0 py-4 pl-4 pr-3 text-right select-none border-r border-(--border-subtle)"
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div
              key={i}
              className="font-mono text-sm leading-[1.7] text-(--text-muted)"
              style={{ minWidth: `${lineNumberWidth}ch` }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        <div className="flex-1 py-4 px-4 overflow-x-auto">
          <div
            className="font-mono text-sm leading-[1.7] [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:m-0! [&_code]:bg-transparent! [&_.line]:block"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}

