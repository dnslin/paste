import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const cssPath = path.join(process.cwd(), "src/app/globals.css");
const layoutPath = path.join(process.cwd(), "src/app/layout.tsx");
const pagePath = path.join(process.cwd(), "src/app/page.tsx");

const css = fs.readFileSync(cssPath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");
const page = fs.readFileSync(pagePath, "utf8");

const requiredTokens: Array<[string, string]> = [
  ["--ui-bg", "#faf9f7"],
  ["--ui-bg-muted", "#f5f3ef"],
  ["--ui-surface", "#ffffff"],
  ["--ui-ink", "#2d2d2d"],
  ["--ui-ink-muted", "#6b6560"],
  ["--ui-border", "#e8e6e3"],
  ["--ui-primary", "#5ba3a0"],
  ["--ui-success", "#7eb89e"],
  ["--ui-warning", "#e8a87c"],
  ["--ui-danger", "#d4726a"],
  ["--ui-info", "#9b8ec2"],
  ["--ui-pixel-sun", "#f9d56e"],
  ["--ui-pixel-brick", "#c75c5c"],
  ["--ui-pixel-mist", "#a8d8d8"],
];

test("design tokens align with UI guide colors", () => {
  for (const [token, value] of requiredTokens) {
    const pattern = new RegExp(`${token}\\s*:\\s*${value}`, "i");
    assert.match(css, pattern);
  }
});

test("font fallbacks include Chinese system fonts", () => {
  assert.match(css, /--font-body:[^;]*PingFang SC/i);
  assert.match(css, /--font-body:[^;]*Microsoft YaHei/i);
  assert.match(css, /--font-mono-stack:/i);
});

test("pixel font remains an accent class", () => {
  assert.match(css, /\.font-pixel\s*\{[^}]*var\(--font-pixel\)/i);
});

test("layout wires theme fonts and page uses base shell", () => {
  assert.match(layout, /DM_Sans/);
  assert.match(layout, /JetBrains_Mono/);
  assert.match(layout, /Silkscreen/);
  assert.match(page, /className=\"app-shell\"/);
});
