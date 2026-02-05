"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  maxLength?: number;
}

export function CodeEditor({
  value,
  onChange,
  language,
  maxLength = 500000,
}: CodeEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [highlightedHtml, setHighlightedHtml] = useState<string>("");
  const [isHighlighting, setIsHighlighting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOverLimit = value.length > maxLength;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const target = e.currentTarget;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        const newValue =
          value.substring(0, start) + "  " + value.substring(end);
        onChange(newValue);
        requestAnimationFrame(() => {
          target.selectionStart = target.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange],
  );

  useEffect(() => {
    if (activeTab !== "preview" || !value) {
      setHighlightedHtml("");
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      setIsHighlighting(true);
      try {
        const { codeToHtml } = await import("shiki");
        const html = await codeToHtml(value, {
          lang: language || "text",
          theme: "vitesse-dark",
        });
        setHighlightedHtml(html);
      } catch {
        setHighlightedHtml(
          `<pre><code>${value.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
        );
      } finally {
        setIsHighlighting(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, language, activeTab]);

  return (
    <div className="flex flex-col rounded-xl border border-(--border-subtle) bg-(--bg-surface) overflow-hidden">
      <div className="flex border-b border-(--border-subtle)">
        <button
          type="button"
          onClick={() => setActiveTab("edit")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "edit"
              ? "text-(--accent-primary) border-b-2 border-(--accent-primary)"
              : "text-(--text-secondary) hover:text-(--text-primary)"
          }`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "preview"
              ? "text-(--accent-primary) border-b-2 border-(--accent-primary)"
              : "text-(--text-secondary) hover:text-(--text-primary)"
          }`}
        >
          Preview
        </button>
      </div>

      <div className="relative h-75 sm:h-87.5 max-h-[50vh]">
        {activeTab === "edit" ? (
          <textarea
            data-testid="code-editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste your code here..."
            spellCheck={false}
            className="w-full h-full p-3 sm:p-4 font-mono text-sm bg-transparent text-(--text-primary) placeholder:text-(--text-tertiary) resize-none outline-none focus:ring-2 focus:ring-(--accent-primary) focus:ring-inset transition-shadow"
          />
        ) : (
          <div className="w-full h-full p-3 sm:p-4 overflow-auto">
            {isHighlighting ? (
              <div className="flex items-center justify-center h-full text-(--text-secondary)">
                Highlighting...
              </div>
            ) : highlightedHtml ? (
              <div
                className="font-mono text-sm [&_pre]:bg-transparent! [&_pre]:p-0! [&_pre]:overflow-visible [&_code]:bg-transparent! [&_code]:whitespace-pre"
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-(--text-tertiary)">
                No content to preview
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-t border-(--border-subtle) text-xs">
        <span
          className={
            isOverLimit ? "text-red-500 font-medium" : "text-(--text-tertiary)"
          }
        >
          {value.length.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
        {isOverLimit && (
          <span className="text-red-500 font-medium">
            Content exceeds maximum length
          </span>
        )}
      </div>
    </div>
  );
}

