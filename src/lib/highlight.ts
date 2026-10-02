import { normalizeLanguage } from './languages';

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function plainCodeHtml(code: string): string {
  const lines = code.split('\n').map((line, index) =>
    `<span class="line"><span class="line-number" aria-hidden="true">${index + 1}</span><span class="line-content">${escapeHtml(line) || '&#8203;'}</span></span>`,
  );
  return `<pre><code>${lines.join('')}</code></pre>`;
}

export async function highlightCode(code: string, language: string): Promise<string> {
  const normalized = normalizeLanguage(language);
  if (!normalized || normalized === 'plaintext') return plainCodeHtml(code);

  try {
    const { codeToHtml } = await import('shiki');
    return await codeToHtml(code, {
      lang: normalized,
      theme: 'vitesse-dark',
      transformers: [{
        code(node) {
          node.children = node.children.filter((child) => child.type !== 'text' || child.value !== '\n');
        },
        line(node, line) {
          node.children = [
            { type: 'element', tagName: 'span', properties: { className: ['line-number'], ariaHidden: 'true' }, children: [{ type: 'text', value: String(line) }] },
            { type: 'element', tagName: 'span', properties: { className: ['line-content'] }, children: node.children },
          ];
        },
      }],
    });
  } catch (err) {
    console.error(`代码高亮失败，语言：${normalized}`, err);
    return plainCodeHtml(code);
  }
}
