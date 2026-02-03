# Development Guidelines: Online Clipboard (Paste)

**Version**: 1.0  
**Date**: 2026-02-03

基于 Vercel React Best Practices 制定，确保代码质量和性能。

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Package Manager | **pnpm** |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Database | SQLite + Drizzle ORM |
| UI | shadcn/ui + **Tailwind CSS 4** |
| Animation | Framer Motion |
| Syntax Highlight | Shiki |
| Icons | Lucide React |

---

## Project Structure

```
paste/
├── docs/                    # 文档
├── public/                  # 静态资源
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── globals.css
│   │   ├── layout.tsx       # Root layout (Server Component)
│   │   ├── page.tsx         # Home page
│   │   ├── [id]/            # Dynamic paste view
│   │   ├── api/             # API routes
│   │   └── admin/           # Admin pages
│   ├── components/
│   │   ├── ui/              # shadcn/ui (DO NOT MODIFY)
│   │   └── *.tsx            # Custom components
│   ├── lib/
│   │   ├── db/              # Database schema & queries
│   │   ├── crypto.ts        # Encryption utilities
│   │   ├── shiki.ts         # Syntax highlighting
│   │   └── utils.ts         # General utilities
│   └── hooks/               # Custom React hooks
├── drizzle/                 # Database migrations
└── package.json
```

---

## Code Style Rules

### 1. Component Architecture

**Server Components by Default**:
```tsx
// ✅ 正确: Server Component (默认)
export function PasteView({ id }: { id: string }) {
  // 可以直接 async/await
  const paste = await getPaste(id);
  return <CodeViewer code={paste.content} />;
}

// ❌ 错误: 不必要的 'use client'
'use client'
export function PasteView({ id }: { id: string }) {
  const [paste, setPaste] = useState(null);
  useEffect(() => { fetchPaste(id).then(setPaste); }, [id]);
  // ...
}
```

**Client Components 只用于交互**:
```tsx
// ✅ 正确: 只在需要交互时使用 'use client'
'use client'
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  // ...
}
```

### 2. Named Exports

```tsx
// ✅ 正确
export function CodeEditor() { ... }
export function PasteOptions() { ... }

// ❌ 错误
export default function CodeEditor() { ... }
```

### 3. No Comments Unless Necessary

```tsx
// ✅ 代码自解释
const isExpired = paste.expiresAt && paste.expiresAt < new Date();

// ❌ 多余注释
// Check if paste is expired
const isExpired = paste.expiresAt && paste.expiresAt < new Date();
```

---

## Performance Rules (Priority Order)

### P1: Eliminating Waterfalls (CRITICAL)

**并行数据获取**:
```tsx
// ✅ 正确: Promise.all 并行
const [paste, stats] = await Promise.all([
  getPaste(id),
  getStats(id)
]);

// ❌ 错误: 串行请求
const paste = await getPaste(id);
const stats = await getStats(id); // 等待上一个完成
```

**Suspense 流式渲染**:
```tsx
// ✅ 正确: 非关键内容用 Suspense 包裹
<Suspense fallback={<StatsSkeleton />}>
  <PasteStats id={id} />
</Suspense>
```

### P2: Bundle Size (CRITICAL)

**避免 Barrel Imports**:
```tsx
// ✅ 正确: 直接导入
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

// ❌ 错误: 从 index 导入
import { Button, Card, Input } from '@/components/ui';
import * as Icons from 'lucide-react';
```

**动态导入重型组件**:
```tsx
// ✅ 正确: Shiki 按需加载
const CodeViewer = dynamic(() => import('@/components/code-viewer'), {
  loading: () => <CodeSkeleton />,
  ssr: true
});
```

### P3: Server-Side Performance (HIGH)

**使用 React.cache() 去重**:
```tsx
import { cache } from 'react';

export const getPaste = cache(async (id: string) => {
  return db.query.pastes.findFirst({ where: eq(pastes.id, id) });
});
```

**最小化传递给客户端的数据**:
```tsx
// ✅ 正确: 只传必要字段
return { id: paste.id, content: paste.content, language: paste.language };

// ❌ 错误: 传整个对象
return paste; // 可能包含敏感字段
```

### P4: Re-render Optimization (MEDIUM)

**useMemo 缓存计算**:
```tsx
// ✅ 正确: 缓存高亮结果
const highlightedCode = useMemo(
  () => highlighter.codeToHtml(code, { lang, theme }),
  [code, lang, theme]
);
```

**使用 useCallback 稳定回调**:
```tsx
// ✅ 正确: 函数式 setState
const handleCopy = useCallback(() => {
  navigator.clipboard.writeText(text);
  setCopied(true);
  setTimeout(() => setCopied(false), 2000);
}, [text]);
```

---

## Database Guidelines

### Schema Design (Drizzle ORM)

```typescript
// src/lib/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const pastes = sqliteTable('pastes', {
  id: text('id').primaryKey(),              // nanoid 6-8 chars
  content: text('content').notNull(),       // 加密后的内容
  language: text('language').default('plaintext'),
  passwordHash: text('password_hash'),      // bcrypt hash
  burnAfterRead: integer('burn_after_read'), // 剩余查看次数
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  viewCount: integer('view_count').default(0),
});
```

### Query Patterns

```typescript
// ✅ 正确: 使用 Drizzle 查询
import { eq, and, gt } from 'drizzle-orm';

const activePastes = await db
  .select()
  .from(pastes)
  .where(
    and(
      gt(pastes.expiresAt, new Date()),
      gt(pastes.burnAfterRead, 0)
    )
  );
```

---

## Security Guidelines

### Encryption

```typescript
// src/lib/crypto.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, encryptedHex, authTagHex] = ciphertext.split(':');
  const decipher = createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### Password Hashing

```typescript
import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Dangerous File Extensions

```typescript
const BLOCKED_EXTENSIONS = [
  '.exe', '.dll', '.bat', '.cmd', '.sh', '.ps1',
  '.vbs', '.js', '.jar', '.msi', '.scr', '.pif'
];
```

---

## API Route Patterns

```typescript
// src/app/api/paste/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const createPasteSchema = z.object({
  content: z.string().min(1).max(500000),
  language: z.string().optional(),
  password: z.string().optional(),
  burnAfterRead: z.number().int().min(1).max(100).optional(),
  expiresIn: z.enum(['1h', '1d', '1w']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createPasteSchema.parse(body);
    
    // ... create paste logic
    
    return NextResponse.json({ id: paste.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

---

## Animation Guidelines

### Framer Motion Patterns

```tsx
// ✅ 正确: 简洁的动画定义
const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
};

<motion.div {...fadeInUp}>
  <CodeEditor />
</motion.div>
```

### Reduced Motion Support

```tsx
import { useReducedMotion } from 'framer-motion';

export function AnimatedCard({ children }) {
  const shouldReduceMotion = useReducedMotion();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
    >
      {children}
    </motion.div>
  );
}
```

---

## Testing Strategy

### Unit Tests (Vitest)

```typescript
// __tests__/crypto.test.ts
import { encrypt, decrypt } from '@/lib/crypto';

test('encrypt and decrypt round trip', () => {
  const plaintext = 'Hello, World!';
  const encrypted = encrypt(plaintext);
  const decrypted = decrypt(encrypted);
  expect(decrypted).toBe(plaintext);
});
```

### E2E Tests (Playwright) - Phase 2

```typescript
test('create and view paste', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="code-input"]', 'console.log("test")');
  await page.click('[data-testid="create-button"]');
  
  await expect(page).toHaveURL(/\/[a-zA-Z0-9]+/);
  await expect(page.locator('code')).toContainText('console.log');
});
```

---

## Git Workflow

### Commit Message Format

```
<type>: <description>

Types:
- feat: 新功能
- fix: Bug 修复
- refactor: 重构
- style: 样式调整
- docs: 文档
- test: 测试
- chore: 构建/配置
```

### Branch Naming

```
feat/paste-creation
fix/encryption-bug
refactor/code-viewer
```

---

## Environment Variables

```env
# .env.local
ENCRYPTION_KEY=<64-char-hex-string>  # openssl rand -hex 32
ADMIN_PASSWORD_HASH=<bcrypt-hash>
DATABASE_URL=file:./paste.db
```

---

## Checklist Before PR

- [ ] `pnpm lint` 通过
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 成功
- [ ] 无 `as any` 或 `@ts-ignore`
- [ ] 新组件遵循 Server/Client 分离
- [ ] 动画支持 `prefers-reduced-motion`
- [ ] 交互元素有 focus 状态
- [ ] 图标按钮有 `aria-label`

---

*Follow these guidelines to maintain code quality and performance.*
